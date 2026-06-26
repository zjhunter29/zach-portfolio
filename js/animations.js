/* =========================================================
   animations.js — scroll reveals + animated counters
   Rect-based (no IntersectionObserver dependency) so content
   is visible without JS and reveals reliably when a page is
   shown by the router.
   ========================================================= */
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pending = new Set();

  const animateCount = (el) => {
    if (el.__counted) return; el.__counted = true;
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";
    if (reduced || !window.requestAnimationFrame) { el.textContent = target + suffix; return; }
    const dur = 1600, start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const reveal = (el) => {
    el.classList.add("in");
    pending.delete(el);
    if (el.hasAttribute("data-count")) animateCount(el);
  };

  const check = () => {
    if (!pending.size) return;
    if (reduced) { [...pending].forEach(reveal); return; }
    const vh = innerHeight || document.documentElement.clientHeight;
    [...pending].forEach((el) => {
      const r = el.getBoundingClientRect();
      // skip hidden (display:none) elements: width/height 0
      if ((r.width || r.height) && r.top < vh * 0.92 && r.bottom > -40) reveal(el);
    });
  };
  // exposed so the router can re-check after switching pages
  window.revealCheck = check;

  let last = 0;
  const onScroll = () => {
    const now = Date.now();
    if (now - last < 70) return;
    last = now;
    check();
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  addEventListener("load", check);

  const register = (el) => { if (reduced) reveal(el); else pending.add(el); };
  window.observeReveal = register;

  document.querySelectorAll("[data-reveal]").forEach((el) => {
    const d = el.getAttribute("data-reveal-delay");
    if (d) el.style.setProperty("--i", d);
    register(el);
  });
  document.querySelectorAll("[data-count]").forEach(register);

  check();
  setTimeout(check, 60);
  setTimeout(check, 600);
})();
