/* =========================================================
   app.js — global config, navigation, UI behaviours
   ========================================================= */

/* ---------------------------------------------------------
   CONFIG  ·  EDIT THIS ONE LINE
   Paste your Formbold form endpoint between the quotes.
   It is shared by BOTH the contact form and the review form.
   e.g. "https://formbold.com/s/XXXXXXX"
   --------------------------------------------------------- */
window.SITE_CONFIG = {
  FORMBOLD_ENDPOINT: "PASTE_FORMBOLD_ENDPOINT_HERE",
  REVIEW_COOLDOWN_DAYS: 7,   // one review per browser every N days
  MIN_SUBMIT_SECONDS: 3      // spam guard: ignore submissions faster than this
};
window.isEndpointConfigured = () =>
  typeof SITE_CONFIG.FORMBOLD_ENDPOINT === "string" &&
  SITE_CONFIG.FORMBOLD_ENDPOINT.startsWith("http");

/* ---------- tiny helpers ---------- */
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

/* ---------- ripple on buttons ---------- */
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

/* ---------- nav: stuck state ---------- */
const nav = $("#nav");
const onScroll = () => {
  nav.classList.toggle("is-stuck", window.scrollY > 12);
  const tt = $("#toTop");
  if (tt) tt.classList.toggle("show", window.scrollY > 600);
};
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- nav: active section highlight ---------- */
const navLinks = $$(".nav__link[href^='#']");
const linkFor = (id) => navLinks.find((a) => a.getAttribute("href") === "#" + id);
const portfolioToggle = $(".nav__sub-toggle");
const secObserver = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const id = en.target.id;
    navLinks.forEach((a) => a.classList.remove("is-active"));
    portfolioToggle && portfolioToggle.classList.remove("is-active");
    if (id === "video" || id === "graphic") {
      portfolioToggle && portfolioToggle.classList.add("is-active");
    } else {
      const l = linkFor(id);
      if (l) l.classList.add("is-active");
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" });
$$("section[id]").forEach((s) => secObserver.observe(s));

/* ---------- desktop submenu (hover + keyboard) ---------- */
const hasSub = $(".nav__has-sub");
if (hasSub && portfolioToggle) {
  const open  = () => portfolioToggle.setAttribute("aria-expanded", "true");
  const close = () => portfolioToggle.setAttribute("aria-expanded", "false");
  hasSub.addEventListener("mouseenter", open);
  hasSub.addEventListener("mouseleave", close);
  hasSub.addEventListener("focusin", open);
  hasSub.addEventListener("focusout", (e) => { if (!hasSub.contains(e.relatedTarget)) close(); });
  portfolioToggle.addEventListener("click", () => {
    document.querySelector("#video")?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    close();
  });
}

/* ---------- mobile drawer ---------- */
const drawer = $("#mobileMenu");
const toggle = $("#navToggle");
const setDrawer = (open) => {
  drawer.classList.toggle("is-open", open);
  drawer.setAttribute("aria-hidden", String(!open));
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  toggle.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-${open ? "close" : "menu"}"/></svg>`;
  document.body.style.overflow = open ? "hidden" : "";
  if (open) drawer.querySelector(".drawer__link")?.focus({ preventScroll: true });
};
toggle?.addEventListener("click", () => setDrawer(!drawer.classList.contains("is-open")));
drawer?.addEventListener("click", (e) => {
  if (e.target === drawer || e.target.closest(".drawer__link, .drawer__cta")) setDrawer(false);
});
addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("is-open")) setDrawer(false); });

/* ---------- cursor-following glow ---------- */
if (!prefersReduced && matchMedia("(pointer:fine)").matches) {
  const glow = $(".cursor-glow");
  let tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty;
  addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  (function loop() {
    cx += (tx - cx) * 0.12; cy += (ty - cy) * 0.12;
    glow.style.left = cx + "px"; glow.style.top = cy + "px";
    requestAnimationFrame(loop);
  })();

  /* hero stage parallax */
  const stage = $("#home .hero__stage");
  if (stage) {
    const hero = $("#home");
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width;
      const dy = (e.clientY - r.top - r.height / 2) / r.height;
      stage.style.transform = `translate3d(${dx * 18}px, ${dy * 18}px, 0)`;
    });
    hero.addEventListener("pointerleave", () => (stage.style.transform = ""));
  }
}

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
