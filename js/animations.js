/* =========================================================
   animations.js — reveals, counters, particles
   Reveal uses a direct rect check (no IntersectionObserver
   dependency) so above-the-fold content shows immediately and
   never gets stuck invisible if compositing/IO is delayed.
   ========================================================= */
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pending = new Set();

  /* ---------- counters ---------- */
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

  /* ---------- reveal ---------- */
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
      if (r.top < vh * 0.92 && r.bottom > -40) reveal(el);
    });
  };

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

  const register = (el) => {
    if (reduced) { reveal(el); return; }
    pending.add(el);
  };
  // expose for gallery.js (cards created later)
  window.observeReveal = register;

  document.querySelectorAll("[data-reveal]").forEach((el) => {
    const d = el.getAttribute("data-reveal-delay");
    if (d) el.style.setProperty("--i", d);
    register(el);
  });
  document.querySelectorAll("[data-count]").forEach(register);

  // initial passes (no rAF dependency) + failsafes
  check();
  setTimeout(check, 60);
  setTimeout(check, 600);

  /* ---------- hero particle field ---------- */
  const canvas = document.getElementById("particles");
  if (!canvas || reduced || !window.requestAnimationFrame) return;
  const ctx = canvas.getContext("2d");
  let w, h, dpr, particles = [], raf, running = true;
  const COLORS = ["91,140,255", "99,102,241", "168,85,247", "34,211,238"];

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(70, Math.floor((w * h) / 16000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      a: Math.random() * 0.5 + 0.15,
      c: COLORS[(Math.random() * COLORS.length) | 0]
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},${p.a})`;
      ctx.fill();
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y, dist = dx * dx + dy * dy;
        if (dist < 12000) {
          ctx.globalAlpha = (1 - dist / 12000) * 0.18;
          ctx.strokeStyle = `rgba(${p.c},1)`;
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
    if (running) raf = requestAnimationFrame(draw);
  };

  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  else addEventListener("resize", resize);
  resize();
  draw();
})();
