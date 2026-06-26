#!/usr/bin/env node
/* =========================================================
   generate-gallery-manifest.js
   Scans /portfolio/videos and /portfolio/images and (re)builds
   videos.json + images.json so new media appears automatically.

   Run locally:  node scripts/generate-gallery-manifest.js
   (Also runs in CI via .github/workflows/update-gallery.yml)

   Conventions
   -----------
   • Filename "Category__My-Title.mp4" -> category "Category", title "My Title".
     No "__"? -> category "Uncategorized", title from the filename.
   • Video thumbnails: place "<same-name>.(jpg|png|webp|svg)" in
     /portfolio/videos/thumbs/. Falls back to a placeholder if absent.
   • Existing title/category/description/duration in the JSON are PRESERVED
     on regeneration, so manual edits are never lost.
   • If a media folder is empty, its manifest is left untouched
     (curated placeholder entries are kept).
   ========================================================= */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIR = {
  videos: path.join(ROOT, "portfolio", "videos"),
  images: path.join(ROOT, "portfolio", "images"),
  thumbs: path.join(ROOT, "portfolio", "videos", "thumbs"),
};
const MANIFEST = {
  videos: path.join(ROOT, "portfolio", "videos.json"),
  images: path.join(ROOT, "portfolio", "images.json"),
};
const VIDEO_EXT = [".mp4"];
const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"];
const THUMB_EXT = [".jpg", ".jpeg", ".png", ".webp", ".svg"];
const DEFAULT_THUMB = "assets/placeholders/design-1.svg";

const slugToText = (s) =>
  s.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
   .replace(/\b\w/g, (c) => c.toUpperCase());

const idify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function parseName(file) {
  const base = file.replace(/\.[^.]+$/, "");
  if (base.includes("__")) {
    const [cat, ...rest] = base.split("__");
    return { category: slugToText(cat), title: slugToText(rest.join("__")) };
  }
  return { category: "Uncategorized", title: slugToText(base) };
}

function listFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => exts.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function readExisting(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const items = Array.isArray(data) ? data : data.items || [];
    const map = new Map();
    items.forEach((it) => { if (it && it.src) map.set(it.src, it); });
    return map;
  } catch {
    return new Map();
  }
}

function readItemsArray(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(data) ? data : (data.items || []);
  } catch { return []; }
}

function findThumb(base) {
  for (const ext of THUMB_EXT) {
    const rel = path.join("portfolio", "videos", "thumbs", base + ext);
    if (fs.existsSync(path.join(ROOT, rel))) return rel.split(path.sep).join("/");
  }
  return DEFAULT_THUMB;
}

/* --- Read the real duration of an .mp4 by parsing its 'mvhd' atom.
   Dependency-free. Returns "M:SS" (or "H:MM:SS"), or "" if unreadable. --- */
function fmtTime(sec) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function parseMvhd(buf) {
  const idx = buf.indexOf(Buffer.from("mvhd"));
  if (idx < 0) return "";
  try {
    const version = buf[idx + 4];
    let timescale, duration;
    if (version === 1) {
      timescale = buf.readUInt32BE(idx + 24);
      duration = Number(buf.readBigUInt64BE(idx + 28));
    } else {
      timescale = buf.readUInt32BE(idx + 16);
      duration = buf.readUInt32BE(idx + 20);
    }
    if (!timescale || !duration) return "";
    return fmtTime(duration / timescale);
  } catch { return ""; }
}
function getMp4Duration(file) {
  let fd;
  try {
    const size = fs.statSync(file).size;
    fd = fs.openSync(file, "r");
    const chunk = Math.min(size, 5 * 1024 * 1024); // moov is usually near start (faststart) or end
    const head = Buffer.alloc(chunk);
    fs.readSync(fd, head, 0, chunk, 0);
    let out = parseMvhd(head);
    if (!out && size > chunk) {
      const tail = Buffer.alloc(chunk);
      fs.readSync(fd, tail, 0, chunk, size - chunk);
      out = parseMvhd(tail);
    }
    return out;
  } catch {
    return "";
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch {}
  }
}

function build(kind) {
  const isVideo = kind === "videos";
  const files = listFiles(DIR[kind], isVideo ? VIDEO_EXT : IMAGE_EXT);
  const prevItems = readItemsArray(MANIFEST[kind]);
  // Video entries added by Google Drive link (no local file) are ALWAYS preserved.
  const driveEntries = isVideo ? prevItems.filter((it) => it && it.drive) : [];

  // No local media files -> keep existing manifest (Drive links + curated placeholders).
  if (files.length === 0) {
    const extra = driveEntries.length ? ` (${driveEntries.length} Drive link${driveEntries.length === 1 ? "" : "s"} preserved)` : "";
    console.log(`• ${kind}: no local media in /portfolio/${kind}/ — keeping existing manifest${extra}.`);
    return false;
  }

  const existing = readExisting(MANIFEST[kind]);
  const fileItems = files.map((file) => {
    const src = `portfolio/${kind}/${file}`;
    const base = file.replace(/\.[^.]+$/, "");
    const meta = parseName(file);
    const prev = existing.get(src) || {};
    const item = {
      id: prev.id || idify(`${kind.slice(0, 3)}-${base}`),
      title: prev.title || meta.title,
      category: prev.category || meta.category,
      description: prev.description || `${meta.category} ${isVideo ? "edit" : "design"} — ${meta.title}.`,
      src,
    };
    if (isVideo) {
      item.thumbnail = prev.thumbnail || findThumb(base);
      // Always read the real duration from the file so the site matches the video.
      item.duration = getMp4Duration(path.join(DIR.videos, file)) || prev.duration || "";
    }
    return item;
  });

  // Drive-linked videos first, then any local files.
  const items = isVideo ? [...driveEntries, ...fileItems] : fileItems;
  const note = isVideo
    ? "Auto-generated. Entries with a \"drive\" field (Google Drive links) are preserved; any .mp4 files in /portfolio/videos/ are added automatically. See README > 'Add a video from Google Drive'."
    : "Auto-generated by scripts/generate-gallery-manifest.js. Drop files into /portfolio/images/ and push.";

  const payload = { generatedAt: new Date().toISOString(), note, items };
  fs.writeFileSync(MANIFEST[kind], JSON.stringify(payload, null, 2) + "\n");
  console.log(`✓ ${kind}: wrote ${items.length} item(s) to ${path.relative(ROOT, MANIFEST[kind])}`);
  return true;
}

let changed = false;
changed = build("videos") || changed;
changed = build("images") || changed;
console.log(changed ? "\nManifests updated." : "\nNo manifest changes.");
process.exit(0);
