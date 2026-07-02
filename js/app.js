/* =========================================================
   app.js — global config, page router, navigation, UI
   ========================================================= */

/* ---------------------------------------------------------
   CONFIG  ·  EDIT THIS ONE LINE
   Paste your Formbold form endpoint between the quotes,
   replacing FORMBOLD_LINK_HERE. It is shared by BOTH the
   contact form and the review form.
   e.g. "https://formbold.com/s/XXXXXXX"
   --------------------------------------------------------- */
window.SITE_CONFIG = {
  FORMBOLD_ENDPOINT: "FORMBOLD_LINK_HERE",
  REVIEW_COOLDOWN_DAYS: 7,   // one review per browser every N days
  MIN_SUBMIT_SECONDS: 3      // spam guard: ignore submissions faster than this
};
// Until the placeholder is replaced with a real https URL, forms run in
// demo mode (validate + show success, send nothing).
window.isEndpointConfigured = () =>
  typeof SITE_CONFIG.FORMBOLD_ENDPOINT === "string" &&
  SITE_CONFIG.FORMBOLD_ENDPOINT.startsWith("http");

/* ---------- helpers ---------- */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

window.toast = (msg) => {
  const el = $("#toast");
  if (!el) return;
  el.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-check"/></svg>${msg}`;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => (el.hidden = true), 350);
  }, 4000);
};

/* ---------- ripple ---------- */
document.addEventListener("pointerdown", (e) => {
  const btn = e.target.closest("[data-ripple]");
  if (!btn || prefersReduced) return;
  const r = btn.getBoundingClientRect();
  const size = Math.max(r.width, r.height);
  const span = document.createElement("span");
  span.className = "ripple";
  span.style.width = span.style.height = size + "px";
  span.style.left = e.clientX - r.left - size / 2 + "px";
  span.style.top = e.clientY - r.top - size / 2 + "px";
  btn.appendChild(span);
  setTimeout(() => span.remove(), 620);
});

/* ---------- nav stuck + back-to-top ---------- */
const nav = $("#nav");
const onScroll = () => {
  nav.classList.toggle("is-stuck", window.scrollY > 12);
  const tt = $("#toTop");
  if (tt) tt.classList.toggle("show", window.scrollY > 500);
};
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* =========================================================
   PAGE ROUTER — each nav target is its own "page"; sections
   are shown/hidden so there is no continuous full-site scroll.
   ========================================================= */
const PAGE_OF = {
  home: "home", featured: "home",
  video: "video", graphic: "graphic",
  services: "services", process: "services",
  about: "about", reviews: "reviews", contact: "contact"
};
const PAGES = ["home", "video", "graphic", "services", "about", "reviews", "contact"];
const sections = $$("main > section[data-page]");
const navLinks = $$(".nav__link[href^='#']");
const portfolioToggle = $(".nav__sub-toggle");
const mainEl = $("#main");
let currentPage = null;

function setActiveNav(page) {
  navLinks.forEach((a) => a.classList.remove("is-active"));
  portfolioToggle && portfolioToggle.classList.remove("is-active");
  if (page === "video" || page === "graphic") {
    portfolioToggle && portfolioToggle.classList.add("is-active");
  } else {
    const l = navLinks.find((a) => PAGE_OF[a.getAttribute("href").slice(1)] === page);
    if (l) l.classList.add("is-active");
  }
}

function showPage(page) {
  if (!PAGES.includes(page)) page = "home";
  currentPage = page;
  sections.forEach((s) => {
    const on = s.dataset.page === page;
    s.hidden = !on;
    if (on && !prefersReduced) { s.classList.remove("page-fade"); void s.offsetWidth; s.classList.add("page-fade"); }
  });
  setActiveNav(page);
  window.scrollTo(0, 0);
  window.revealCheck && window.revealCheck();
}

function navigate(page, push = true) {
  showPage(page);
  if (push) { try { history.pushState({ page }, "", "#" + page); } catch (e) {} }
  if (mainEl) { mainEl.setAttribute("tabindex", "-1"); mainEl.focus({ preventScroll: true }); }
}

addEventListener("popstate", () => {
  showPage(PAGE_OF[location.hash.slice(1)] || "home");
});

// intercept all internal hash links → route or in-page scroll
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const href = a.getAttribute("href");
  if (href === "#") { e.preventDefault(); return; }       // placeholder links
  const id = href.slice(1);
  const page = PAGE_OF[id];
  if (!page) return;                                       // unknown anchor → default
  e.preventDefault();
  if (page === currentPage && id !== page) {
    document.getElementById(id)?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
  } else {
    navigate(page);
  }
  if (drawer && drawer.classList.contains("is-open")) setDrawer(false);
});

/* ---------- desktop submenu (hover + keyboard) ---------- */
const hasSub = $(".nav__has-sub");
if (hasSub && portfolioToggle) {
  const open  = () => portfolioToggle.setAttribute("aria-expanded", "true");
  const close = () => portfolioToggle.setAttribute("aria-expanded", "false");
  hasSub.addEventListener("mouseenter", open);
  hasSub.addEventListener("mouseleave", close);
  hasSub.addEventListener("focusin", open);
  hasSub.addEventListener("focusout", (e) => { if (!hasSub.contains(e.relatedTarget)) close(); });
  portfolioToggle.addEventListener("click", () => { navigate("video"); close(); });
}

/* ---------- mobile drawer ---------- */
const drawer = $("#mobileMenu");
const toggle = $("#navToggle");
function setDrawer(open) {
  drawer.classList.toggle("is-open", open);
  drawer.setAttribute("aria-hidden", String(!open));
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  toggle.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-${open ? "close" : "menu"}"/></svg>`;
  document.body.style.overflow = open ? "hidden" : "";
  if (open) drawer.querySelector(".drawer__link")?.focus({ preventScroll: true });
}
toggle?.addEventListener("click", () => setDrawer(!drawer.classList.contains("is-open")));
drawer?.addEventListener("click", (e) => { if (e.target === drawer) setDrawer(false); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("is-open")) setDrawer(false); });

/* ---------- back to top + year ---------- */
$("#toTop")?.addEventListener("click", () =>
  scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" })
);
$("#year").textContent = new Date().getFullYear();

/* ---------- prefill contact service from pricing CTA ---------- */
$$("[data-service]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sel = $("#c-service");
    if (sel) {
      const want = btn.dataset.service;
      [...sel.options].forEach((o) => { if (o.value === want || o.text === want) sel.value = o.value || o.text; });
    }
  });
});

/* ---------- initial route ---------- */
showPage(PAGE_OF[location.hash.slice(1)] || "home");
