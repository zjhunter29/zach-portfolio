# Zach — Premium Portfolio

A custom-built, single-page **liquid-glass** portfolio for a video editor / graphic designer / UX designer.
Dark cinematic aesthetic, glassmorphism UI, smooth scroll-reveal animations, a self-updating media gallery,
and fully-functional contact + review forms powered by [Resend](https://resend.com).

No build step. No framework. Just HTML, CSS and vanilla JS.

---

## Table of contents

- [Quick start](#quick-start)
- [Deploy to GitHub Pages](#deploy-to-github-pages)
- [Set up email (Resend)](#set-up-email-resend)
- [Add a video from Google Drive](#add-a-video-from-google-drive)
- [Add new images](#add-new-images)
- [How the gallery automation works](#how-the-gallery-automation-works)
- [How the review system works](#how-the-review-system-works)
- [Customize pricing](#customize-pricing)
- [Edit colors](#edit-colors)
- [Edit animations](#edit-animations)
- [Replace placeholder content](#replace-placeholder-content)
- [Project structure](#project-structure)
- [Performance, accessibility & SEO](#performance-accessibility--seo)

---

## Quick start

Because the gallery loads JSON manifests with `fetch()`, open the site through a **local web server**
(opening `index.html` directly with `file://` still works — it falls back to embedded data — but a server is
recommended for an accurate preview).

```bash
# any one of these from the project root:
npx serve .
# or
python -m http.server 8000
```

Then visit `http://localhost:8000` (or the port shown).

---

## Deploy to GitHub Pages

1. Create a new GitHub repository and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: portfolio"
   git branch -M main
   git remote add origin https://github.com/<USER>/<REPO>.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment**.
3. Set **Source = Deploy from a branch**, **Branch = `main`**, **Folder = `/ (root)`**, then **Save**.
4. Your site goes live at `https://<USER>.github.io/<REPO>/` in a minute or two.
5. Update the domain placeholders (search the project for `https://example.com/`) in:
   - `index.html` — `<link rel="canonical">`, Open Graph & Twitter `url`/`image`
   - `robots.txt` and `sitemap.xml`

> The included GitHub Action (`.github/workflows/update-gallery.yml`) needs write permission. It uses the
> default `GITHUB_TOKEN`; if pushes fail, enable **Settings → Actions → General → Workflow permissions →
> Read and write permissions**.

---

## Set up email (Resend)

Both the **contact** and **review** forms send email through [Resend](https://resend.com) via a small
serverless function (`api/send.js`). The forms POST JSON to it; it sends the email.

> **Why a function?** A Resend API key is a **secret**. If it lived in the website's JavaScript, anyone could
> view-source, copy it, and send email as you (and Resend blocks browser-side calls anyway). So the key lives
> on the server as an environment variable — never in the site code. That's the secure "paste the key when
> ready" step.

### Recommended: host the whole site on Vercel (static site + function together)

1. Create a free [Resend](https://resend.com) account. For real sending, **add and verify your domain**
   (Resend → Domains). For a quick test you can skip this and use the default `onboarding@resend.dev` sender,
   which only delivers to your own Resend account email.
2. Resend → **API Keys** → create one (looks like `re_xxxxxxxx`). Copy it.
3. Import this GitHub repo into [Vercel](https://vercel.com) ("New Project"). No build settings needed — it
   serves the static files and the `api/send` function automatically.
4. In Vercel → **Project → Settings → Environment Variables**, add (this is where you paste the key):

   | Name | Value |
   |------|-------|
   | `RESEND_API_KEY` | your `re_…` key |
   | `CONTACT_TO_EMAIL` | the inbox that should receive form emails |
   | `RESEND_FROM` | *(optional)* verified sender, e.g. `Zach <forms@yourdomain.com>` |
   | `ALLOW_ORIGIN` | *(optional, recommended)* your site origin, e.g. `https://your-app.vercel.app` |

5. Deploy. Leave `EMAIL_ENDPOINT` in `js/app.js` as `"/api/send"`. Done — both forms now send real email.

### Alternative: keep the site on GitHub Pages, run only the function on Vercel

Deploy this repo to Vercel as above (for the function), then in **`js/app.js`** set the endpoint to the full
function URL and lock CORS to your Pages origin via the `ALLOW_ORIGIN` env var:

```js
window.SITE_CONFIG = {
  EMAIL_ENDPOINT: "https://your-app.vercel.app/api/send",  // ← your Vercel function URL
  REVIEW_COOLDOWN_DAYS: 7,
  MIN_SUBMIT_SECONDS: 3
};
```

Each email's payload includes a `formType` field (`"contact"` or `"review"`) so the function formats them
differently. On `localhost`/`file://` the forms run in **demo mode** (validate + show success, send nothing),
so you can preview without a backend.

> Prefer Netlify or Cloudflare? The function is plain Node with no dependencies — it ports easily; ask and it
> can be adapted to a Netlify/Cloudflare function.

---

## Add a video from Google Drive

Best for large files — nothing is uploaded to the repo, you just paste a link.

1. In **Google Drive**, right-click your video → **Share** → set **General access** to
   **"Anyone with the link"** → **Copy link**. (This is required, or the video/thumbnail won't load.)
2. Open **`portfolio/videos.json`** (edit it right on GitHub). Copy the `{ … }` example block and set:
   ```json
   {
     "title": "My Cinematic Reel",
     "description": "Short description shown on the card.",
     "drive": "https://drive.google.com/file/d/1AbCdEf…/view?usp=sharing"
   }
   ```
   Paste your copied link into **`drive`**. Add one block per video (comma-separated). Delete the
   `"Example — replace or delete me"` entry once you've added your own. (No `id` or `category` needed.)
3. Commit. That's it — the card shows a **thumbnail pulled automatically from Drive**, and clicking it opens an
   **embedded Drive player** in the modal (works for big files). The `title` and `description` show on the card.
   You can optionally add `"duration": "2:14"` and `"thumbnail": "…"` to override.

> Any Drive link format works (`…/file/d/ID/view`, `open?id=ID`, or a raw ID). The `drive` entries are **never
> overwritten** by the gallery automation, so they're safe to keep.

## Add a video as a local file (optional, for small clips)

Prefer to commit a small `.mp4` instead? Drop it into **`/portfolio/videos/`** (optionally a matching thumbnail
in `/portfolio/videos/thumbs/`), name it after the title (e.g. `My-Title.mp4`), and push. The GitHub Action
rebuilds `portfolio/videos.json`: the **duration is read automatically** from the file (a 30-second clip shows
`0:30`) and the title comes from the filename. To run the generator locally instead of waiting for CI:
```bash
node scripts/generate-gallery-manifest.js
```

## Add new images

Same flow, into **`/portfolio/images/`**. Supported: **PNG, JPG, JPEG, WEBP**.
Name it after the title (e.g. `Aurora-Identity.png`). Commit & push and the Action rebuilds
`portfolio/images.json`.

---

## How the gallery automation works

- The site renders **exclusively** from `portfolio/videos.json` and `portfolio/images.json`
  (see `js/gallery.js`). Cards show the `title` (and description for videos) — there are no categories.
- **`scripts/generate-gallery-manifest.js`** scans the media folders and rebuilds the manifests:
  - The title comes from the filename; **video duration is parsed from the `.mp4`**.
  - **Existing `title` and `description` values are preserved** on regeneration, so manual edits to
    the JSON are never overwritten (duration is always refreshed from the file).
  - If a media folder is **empty**, its manifest is **left untouched** — that's why the curated placeholder
    items keep showing until you add real media.
- **`.github/workflows/update-gallery.yml`** runs the generator on every push that touches
  `portfolio/images/**` or `portfolio/videos/**`, then commits the updated JSON back to the repo. The trigger
  intentionally excludes the `*.json` files so the commit-back doesn't loop.

> Tip: you can also edit the JSON files by hand (to tweak a description or set a video `duration`) — your edits
> survive the next automated run.

---

## How the review system works

- Visitors submit a review (name, email, 1–5 star rating, text) in the **Leave a review** form.
- It posts to the **same `/api/send` function** as the contact form, with a `formType: "review"` field, so
  reviews are **emailed privately to you and are never auto-published** on the site.
- **One review per browser every 7 days** is enforced with `localStorage` (`REVIEW_COOLDOWN_DAYS` in
  `js/app.js`). After submitting, the form shows the date the visitor can post again.

> ⚠️ **Client-side limitation:** the 7-day limit is a convenience feature only. It lives in the visitor's
> browser and can be bypassed by clearing storage, using another browser, or incognito mode. Treat it as
> friction against accidental duplicates, **not** as security or true rate-limiting.

The testimonials in the scrolling marquee are **placeholder content** defined in `js/reviews.js`
(`TESTIMONIALS` array) — edit that array to show real reviews you've approved.

---

## Customize pricing

Pricing cards are plain HTML in `index.html` (search for `class="pricing"`). For each `.price-card`, edit:
- `<h3>` — service name, `.price-card__sub` — the small subtitle
- `.price-card__price` — the number (`<span class="cur">$</span>149<span class="dec">.99</span>`)
- the `.price-card__list` `<li>` items — features
- `data-service="…"` on the CTA — this value pre-selects the matching option in the contact form

The same prices are mirrored in the **JSON-LD** structured data (`<script type="application/ld+json">` in the
`<head>`) — update them there too so search engines stay accurate.

## Edit colors

All colors are CSS custom properties at the top of **`css/styles.css`** under `:root`. Key tokens:

```css
--accent: #3b9eff;        /* primary glowing blue            */
--grad: linear-gradient(135deg, #1f6fff, #4da3ff);  /* glowing-blue brand gradient */
--glow: 59,158,255;       /* RGB used for glow shadows       */
--text / --text-soft / --text-muted;  /* type colors        */
```

Change these once and the whole site (buttons, glows, gradients, glass) updates. The page **background** is a
135° gradient set on `body`: `linear-gradient(135deg, #070709, #15161c)`.

## Edit animations

- **Durations / easing:** tokens `--t`, `--t-fast`, `--ease`, `--ease-out` in `:root`.
- **Scroll reveals:** the `[data-reveal]` system in `js/animations.js` + the `[data-reveal]` rules at the
  bottom of `styles.css`. Stagger is controlled by `--i` (and `data-reveal-delay` on hero elements).
- **Marquee:** the testimonial scroller uses the `marquee` keyframes in `styles.css`.
- **Reduced motion:** everything is automatically minimized under
  `@media (prefers-reduced-motion: reduce)`.

## Replace placeholder content

| What | Where |
|------|-------|
| Name / brand "Zach" | `index.html` (brand, hero `<h1>`, footer), `assets/icons/favicon.svg` |
| Hero copy & subtitle | `.hero__copy` in `index.html` |
| Social links (`href="#"`) | contact + footer `.contact__social` |
| Portrait | replace `assets/placeholders/portrait.svg` |
| OG share image | replace `assets/placeholders/og-image.svg` (a 1200×630 PNG/JPG is best for social) |
| Software badges | `assets/logos/*.svg` (swap for official brand assets per their guidelines) |
| Testimonials | `TESTIMONIALS` array in `js/reviews.js` |
| Stats / counters | `data-count` attributes in the About section |

The placeholder visuals were generated programmatically; they're real SVG files you can freely overwrite.

---

## Navigation

The site behaves like **separate pages**: each nav item (Home, Video Editing, Graphic Design, Services, About,
Reviews, Contact) shows only its own section — there is no single continuous scroll. It's still one `index.html`;
`js/app.js` holds a tiny hash router (`showPage`) that maps each nav target to a page via the `data-page`
attribute on each `<section>`. Process lives on the Services page; Featured lives on Home.

---

## Project structure

```
.
├── index.html
├── css/styles.css
├── api/send.js         # Resend email function (contact + review) — serverless
├── js/
│   ├── app.js          # config (email endpoint), page router, nav, ripple, drawer
│   ├── animations.js   # scroll reveals + counters
│   ├── gallery.js      # manifest loading, modal video + lightbox
│   ├── reviews.js      # testimonials + review form (7-day localStorage gate)
│   └── contact.js      # contact form (validation, honeypot, file upload, Resend)
├── portfolio/
│   ├── images/         # ← drop PNG/JPG/JPEG/WEBP here
│   ├── videos/         # ← drop MP4 here  (+ videos/thumbs/ for thumbnails)
│   ├── images.json     # auto-generated manifest
│   └── videos.json     # auto-generated manifest
├── scripts/generate-gallery-manifest.js
├── .github/workflows/update-gallery.yml
├── assets/{icons,logos,placeholders}/
├── robots.txt
├── sitemap.xml
└── README.md
```

## Performance, accessibility & SEO

- Vanilla JS, zero runtime dependencies; scripts are `defer`-loaded; images are `loading="lazy"` with set
  dimensions to avoid layout shift.
- Semantic HTML, skip-link, keyboard-operable nav/menus/cards/modal, visible focus states, ARIA labels, and
  `aria-live` form status regions.
- Respects `prefers-reduced-motion`. Never disables zoom.
- SEO: meta description, Open Graph + Twitter cards, JSON-LD (`Person` / `ProfessionalService` / `WebSite`),
  canonical URL, `robots.txt`, `sitemap.xml`, SVG favicon.

> For a perfect Lighthouse run, host real, compressed media (WebP/AVIF images, H.264 MP4s) and serve over
> HTTPS via GitHub Pages.

---

Built with care. Swap in your work, add your Resend key on the server, and ship. 🚀
