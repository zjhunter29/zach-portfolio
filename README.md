# Zach — Premium Portfolio

A custom-built, single-page **liquid-glass** portfolio for a video editor / graphic designer / UX designer.
Dark cinematic aesthetic, glassmorphism UI, smooth scroll-reveal animations, a self-updating media gallery,
and fully-functional contact + review forms powered by [Formbold](https://formbold.com).

No build step. No framework. Just HTML, CSS and vanilla JS.

---

## Table of contents

- [Quick start](#quick-start)
- [Deploy to GitHub Pages](#deploy-to-github-pages)
- [Configure the Formbold endpoint](#configure-the-formbold-endpoint)
- [Add new videos](#add-new-videos)
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

## Configure the Formbold endpoint

Both the **contact** form and the **review** form post to one Formbold endpoint.

1. Create a free form at [formbold.com](https://formbold.com) and copy its endpoint
   (looks like `https://formbold.com/s/XXXXXXX`).
2. Open **`js/app.js`** and edit the single config line near the top:

   ```js
   window.SITE_CONFIG = {
     FORMBOLD_ENDPOINT: "https://formbold.com/s/XXXXXXX",  // ← paste yours here
     REVIEW_COOLDOWN_DAYS: 7,
     MIN_SUBMIT_SECONDS: 3
   };
   ```

That's it — no other code changes are needed. Submissions arrive in your Formbold inbox/email.
Each payload includes a `formType` field (`"contact"` or `"review"`) so you can tell them apart, plus a
`_subject` line. Until you paste a real endpoint, both forms run in **demo mode** (they validate and show the
success state but don't send anything — check the browser console for a notice).

---

## Add new videos

1. Drop `.mp4` files into **`/portfolio/videos/`**.
2. (Optional) Add a matching thumbnail (`.jpg`/`.png`/`.webp`) with the **same base name** into
   **`/portfolio/videos/thumbs/`**. Without one, a placeholder is used.
3. Name files using the convention `Category__My-Title.mp4` to auto-fill the category and title, e.g.
   `Cinematic__Skyline-Brand-Film.mp4` → category **Cinematic**, title **Skyline Brand Film**.
4. Commit & push. The GitHub Action regenerates `portfolio/videos.json` automatically.

The **duration is read automatically** from each `.mp4` (a 30-second clip shows `0:30`), and the **title and
category come from the filename** — so the card on the site always matches the actual file. The category is shown
as a label on each card (the on-page filter buttons were intentionally removed for a cleaner look).

To run the generator locally instead of waiting for CI:
```bash
node scripts/generate-gallery-manifest.js
```

## Add new images

Same flow, into **`/portfolio/images/`**. Supported: **PNG, JPG, JPEG, WEBP**.
Use `Category__My-Title.png` (e.g. `Branding__Aurora-Identity.png`). Commit & push and the Action rebuilds
`portfolio/images.json`. The category appears as a label on each design card.

---

## How the gallery automation works

- The site renders **exclusively** from `portfolio/videos.json` and `portfolio/images.json`
  (see `js/gallery.js`). Each item's category is shown as a label on its card.
- **`scripts/generate-gallery-manifest.js`** scans the media folders and rebuilds the manifests:
  - Title/category come from the filename (`Category__Title.ext`); **video duration is parsed from the `.mp4`**.
  - **Existing `title`, `category` and `description` values are preserved** on regeneration, so manual edits to
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
- It posts to the **same Formbold endpoint** as the contact form, with a hidden `formType=review` field, so
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
├── js/
│   ├── app.js          # config (Formbold endpoint), nav, cursor glow, ripple, drawer
│   ├── animations.js   # scroll reveals, counters, particle field
│   ├── gallery.js      # manifest loading, filtering, modal/lightbox
│   ├── reviews.js      # testimonials + review form (7-day localStorage gate)
│   └── contact.js      # contact form (validation, honeypot, file upload, Formbold)
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

Built with care. Swap in your work, paste your Formbold endpoint, and ship. 🚀
