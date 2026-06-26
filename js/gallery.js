/* =========================================================
   gallery.js — portfolio loading, modal video + lightbox
   Loads from /portfolio/videos.json and /portfolio/images.json.
   Falls back to embedded data when opened from file:// (no fetch).
   Video metadata (title / category / duration) is whatever the
   manifest contains — the GitHub Action / generator writes it
   from each .mp4 file you add.
   ========================================================= */
(() => {
  const reveal = window.observeReveal || ((el) => el.classList.add("in"));

  /* ---------- embedded fallback (mirrors the JSON manifests) ---------- */
  const FALLBACK = {
    videos: [
      { id:"v1", title:"Championship Recap", category:"Sports", description:"High-energy season recap cut to the beat with speed ramps and color-graded highlights.", thumbnail:"portfolio/videos/thumbs/sample-1.svg", src:"", duration:"1:24" },
      { id:"v2", title:"Neon Drive Spot", category:"Commercial", description:"30-second product spot with cinematic lighting and a punchy sound design.", thumbnail:"portfolio/videos/thumbs/sample-2.svg", src:"", duration:"0:30" },
      { id:"v3", title:"Solitude — Short Film", category:"Cinematic", description:"A moody narrative edit with film-grade color and atmospheric pacing.", thumbnail:"portfolio/videos/thumbs/sample-3.svg", src:"", duration:"3:52" },
      { id:"v4", title:"10 Min That Changed Me", category:"YouTube", description:"Retention-optimised long-form edit with b-roll and motion captions.", thumbnail:"portfolio/videos/thumbs/sample-4.svg", src:"", duration:"10:18" },
      { id:"v5", title:"Apex Highlights", category:"Gaming", description:"Fast-paced gaming montage synced to music with stylised overlays.", thumbnail:"portfolio/videos/thumbs/sample-5.svg", src:"", duration:"2:09" },
      { id:"v6", title:"Summer Launch Promo", category:"Promotional", description:"Bright promotional teaser with bold kinetic type and a clear CTA.", thumbnail:"portfolio/videos/thumbs/sample-6.svg", src:"", duration:"0:45" },
      { id:"v7", title:"Kinetic Type Reel", category:"Motion Graphics", description:"Animated typography reel with smooth easing and expressive transitions.", thumbnail:"portfolio/videos/thumbs/sample-7.svg", src:"", duration:"1:02" },
      { id:"v8", title:"Skyline Brand Film", category:"Cinematic", description:"Premium brand film blending drone footage with a refined cinematic grade.", thumbnail:"portfolio/videos/thumbs/sample-8.svg", src:"", duration:"2:38" }
    ],
    images: [
      { id:"i1", title:"Think Big", category:"Posters", description:"Bold typographic poster exploring scale, contrast and gradient.", src:"assets/placeholders/design-1.svg" },
      { id:"i2", title:"Aurora Identity", category:"Branding", description:"Complete brand identity — logo, palette and type.", src:"assets/placeholders/design-2.svg" },
      { id:"i3", title:"Vertex Mark", category:"Logos", description:"Geometric monogram mark built on a precise grid.", src:"assets/placeholders/design-3.svg" },
      { id:"i4", title:"Pulse Dashboard", category:"UI Design", description:"Analytics dashboard UI with a clean dark theme.", src:"assets/placeholders/design-4.svg" },
      { id:"i5", title:"Drop Friday", category:"Social Media", description:"Scroll-stopping social drop graphic for launch day.", src:"assets/placeholders/design-5.svg" },
      { id:"i6", title:"Chromatic", category:"Artwork", description:"Experimental digital artwork with gradient meshes.", src:"assets/placeholders/design-6.svg" },
      { id:"i7", title:"Gallery Print No.4", category:"Print Design", description:"Editorial print layout with refined spacing.", src:"assets/placeholders/design-7.svg" },
      { id:"i8", title:"Stream Cover", category:"Thumbnails", description:"Click-optimised thumbnail with a strong focal point.", src:"assets/placeholders/design-8.svg" },
      { id:"i9", title:"Lunar Studio", category:"Branding", description:"Minimal branding board with mark variations.", src:"assets/placeholders/design-9.svg" },
      { id:"i10", title:"Monarch", category:"Logos", description:"Premium emblem logo with balanced negative space.", src:"assets/placeholders/design-10.svg" },
      { id:"i11", title:"Flow App", category:"UI Design", description:"Mobile app UI focused on clarity and flow.", src:"assets/placeholders/design-11.svg" },
      { id:"i12", title:"Stay Bold", category:"Posters", description:"Motivational poster with expressive type.", src:"assets/placeholders/design-12.svg" }
    ]
  };

  async function loadItems(url, key) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.items;
      return Array.isArray(items) && items.length ? items : FALLBACK[key];
    } catch {
      return FALLBACK[key];
    }
  }

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

  /* ---------- modal / lightbox ---------- */
  const modal = document.getElementById("mediaModal");
  const stage = document.getElementById("modalStage");
  const mCat = document.getElementById("modalCat");
  const mTitle = document.getElementById("modalTitle");
  const mDesc = document.getElementById("modalDesc");
  let lastFocused = null;

  function openModal(html, item) {
    stage.innerHTML = html;
    mCat.textContent = item.category || "";
    mTitle.textContent = item.title || "";
    mDesc.textContent = item.description || "";
    lastFocused = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    modal.querySelector(".modal__close")?.focus();
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    stage.innerHTML = "";
    lastFocused?.focus?.();
  }
  modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal(); });

  const openVideo = (item) => {
    const html = item.src
      ? `<video controls autoplay playsinline preload="metadata" poster="${esc(item.thumbnail)}"><source src="${esc(item.src)}" type="video/mp4">Your browser does not support video.</video>`
      : `<div class="modal__placeholder"><svg class="ico" aria-hidden="true"><use href="#i-film"/></svg><p><strong>Preview coming soon.</strong><br>Add <code>${esc(item.title)}.mp4</code> to <code>/portfolio/videos/</code> and its <code>src</code> in <code>videos.json</code>.</p></div>`;
    openModal(html, item);
  };
  const openImage = (item) =>
    openModal(`<img src="${esc(item.src)}" alt="${esc(item.title)} — ${esc(item.category)}">`, item);

  /* ---------- gallery controller (no filters) ---------- */
  function setupGallery({ items, type, gridId, loadMoreId, pageSize = 6 }) {
    const grid = document.getElementById(gridId);
    const loadBtn = document.getElementById(loadMoreId);
    if (!grid) return;
    let shown = pageSize;

    const cardHTML = (item, idx) => {
      if (type === "video") {
        return `<article class="card card--video" tabindex="0" role="button" aria-label="Play ${esc(item.title)}" data-id="${esc(item.id)}" style="--i:${idx % pageSize}">
          <div class="card__media">
            ${item.duration ? `<span class="card__dur">${esc(item.duration)}</span>` : ""}
            <img src="${esc(item.thumbnail)}" alt="${esc(item.title)} — ${esc(item.category)} video thumbnail" loading="lazy" decoding="async">
            <div class="card__overlay" aria-hidden="true"></div>
            <span class="card__play" aria-hidden="true"><svg class="ico" aria-hidden="true"><use href="#i-play"/></svg></span>
            <div class="card__info">
              <span class="card__cat">${esc(item.category)}</span>
              <h3 class="card__title">${esc(item.title)}</h3>
              <p class="card__desc">${esc(item.description)}</p>
            </div>
          </div></article>`;
      }
      return `<article class="card card--image" tabindex="0" role="button" aria-label="View ${esc(item.title)}" data-id="${esc(item.id)}" style="--i:${idx % pageSize}">
        <div class="card__media">
          <img src="${esc(item.src)}" alt="${esc(item.title)} — ${esc(item.category)} design" loading="lazy" decoding="async">
          <div class="card__overlay" aria-hidden="true"></div>
          <div class="card__info">
            <span class="card__cat">${esc(item.category)}</span>
            <h3 class="card__title">${esc(item.title)}</h3>
          </div>
        </div></article>`;
    };

    function render() {
      grid.innerHTML = items.slice(0, shown).map(cardHTML).join("");
      loadBtn.hidden = shown >= items.length;
      grid.querySelectorAll(".card").forEach((c) => reveal(c));
      window.revealCheck && window.revealCheck();
    }

    const open = (card) => {
      const item = items.find((i) => i.id === card.dataset.id);
      if (!item) return;
      type === "video" ? openVideo(item) : openImage(item);
    };
    grid.addEventListener("click", (e) => { const c = e.target.closest(".card"); if (c) open(c); });
    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const c = e.target.closest(".card"); if (!c) return;
      e.preventDefault(); open(c);
    });
    loadBtn.addEventListener("click", () => { shown += pageSize; render(); });

    render();
  }

  /* ---------- boot ---------- */
  Promise.all([
    loadItems("portfolio/videos.json", "videos"),
    loadItems("portfolio/images.json", "images")
  ]).then(([videos, images]) => {
    setupGallery({ items: videos, type: "video", gridId: "video-grid", loadMoreId: "video-load-more", pageSize: 6 });
    setupGallery({ items: images, type: "image", gridId: "image-grid", loadMoreId: "image-load-more", pageSize: 8 });
  });
})();
