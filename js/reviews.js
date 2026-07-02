/* =========================================================
   reviews.js — testimonial marquee + review submission form
   - One review per browser every SITE_CONFIG.REVIEW_COOLDOWN_DAYS days
     (localStorage; client-side convenience only, not security)
   - Submits to the SAME Formbold endpoint as contact, with formType=review
   ========================================================= */
(() => {
  const CFG = window.SITE_CONFIG;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const star = `<svg class="ico" aria-hidden="true"><use href="#i-star"/></svg>`;

  /* ---------- existing testimonials (placeholders) ---------- */
  const TESTIMONIALS = [
    { name:"Jordan Rivera", role:"YouTube Creator", rating:5, quote:"Insane turnaround and the edit looked premium. My retention jumped and the comments noticed the quality." },
    { name:"Maya Chen", role:"Startup Founder", rating:5, quote:"Zach rebuilt our entire brand identity. Clean, modern and exactly the energy we were going for." },
    { name:"Devon Brooks", role:"Esports Manager", rating:5, quote:"Our highlight reels finally feel pro. Fast cuts, perfect sync, zero hand-holding needed." },
    { name:"Sara Whitfield", role:"Marketing Lead", rating:5, quote:"The commercial spot punched way above its budget. Cinematic, sharp and on-brand." },
    { name:"Liam Carter", role:"Musician", rating:4, quote:"Great communication and the motion graphics were exactly what my release needed." },
    { name:"Priya Nair", role:"Small Business Owner", rating:5, quote:"Thumbnails, posters, the lot — every deliverable was polished and on time. Highly recommend." }
  ];

  const card = (t) => `
    <figure class="t-card glass">
      <svg class="ico t-card__quote-ico" aria-hidden="true"><use href="#i-quote"/></svg>
      <div class="t-card__stars" aria-label="${t.rating} out of 5 stars">${star.repeat(t.rating)}</div>
      <blockquote>${t.quote}</blockquote>
      <figcaption class="t-card__author">
        <span class="t-card__avatar" aria-hidden="true">${t.name.charAt(0)}</span>
        <span><span class="t-card__name">${t.name}</span><br><span class="t-card__role">${t.role}</span></span>
      </figcaption>
    </figure>`;

  const track = document.getElementById("reviewMarquee");
  if (track) {
    const html = TESTIMONIALS.map(card).join("");
    // duplicate for a seamless infinite loop
    track.innerHTML = html + html;
    track.setAttribute("aria-hidden", "false");
  }

  /* ---------- review form ---------- */
  const form = document.getElementById("reviewForm");
  if (!form) return;
  const statusEl = document.getElementById("reviewStatus");
  const submitBtn = document.getElementById("reviewSubmit");
  const ratingInput = document.getElementById("r-rating");
  const starWrap = document.getElementById("ratingStars");
  const starBtns = [...starWrap.querySelectorAll(".stars__btn")];
  const STORAGE_KEY = "zach_review_last";
  const loadTime = Date.now();

  /* star rating interaction */
  let rating = 0;
  const paint = (val) => starBtns.forEach((b, i) => b.classList.toggle("is-on", i < val));
  const setRating = (val) => {
    rating = val; ratingInput.value = String(val);
    starBtns.forEach((b, i) => b.setAttribute("aria-checked", String(i === val - 1)));
    paint(val); clearError("r-rating");
  };
  starBtns.forEach((b) => {
    const v = +b.dataset.value;
    b.addEventListener("click", () => setRating(v));
    b.addEventListener("mouseenter", () => paint(v));
  });
  starWrap.addEventListener("mouseleave", () => paint(rating));
  starWrap.addEventListener("keydown", (e) => {
    if (["ArrowRight","ArrowUp"].includes(e.key)) { e.preventDefault(); setRating(Math.min(5, (rating || 0) + 1)); starBtns[rating-1]?.focus(); }
    if (["ArrowLeft","ArrowDown"].includes(e.key)) { e.preventDefault(); setRating(Math.max(1, (rating || 1) - 1)); starBtns[rating-1]?.focus(); }
  });

  /* validation helpers */
  const setError = (id, msg) => {
    const field = document.getElementById(id)?.closest(".field") || starWrap.closest(".field");
    field?.classList.add("is-invalid");
    const e = form.querySelector(`[data-error-for="${id}"]`); if (e) e.textContent = msg;
  };
  const clearError = (id) => {
    const field = document.getElementById(id)?.closest(".field") || starWrap.closest(".field");
    field?.classList.remove("is-invalid");
    const e = form.querySelector(`[data-error-for="${id}"]`); if (e) e.textContent = "";
  };

  /* cooldown gate */
  function cooldownInfo() {
    const last = +localStorage.getItem(STORAGE_KEY) || 0;
    const ms = CFG.REVIEW_COOLDOWN_DAYS * 86400000;
    const remaining = last + ms - Date.now();
    return { blocked: remaining > 0, until: new Date(last + ms) };
  }
  function applyCooldown() {
    const { blocked, until } = cooldownInfo();
    if (blocked) {
      submitBtn.disabled = true;
      statusEl.textContent = `Thanks! You can submit another review on ${until.toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" })}.`;
    }
    return blocked;
  }
  applyCooldown();

  /* live clearing */
  ["r-name","r-email","r-review"].forEach((id) =>
    document.getElementById(id)?.addEventListener("input", () => clearError(id))
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.className = "form-status";
    if (applyCooldown()) return;

    // honeypot
    if (form.company.value) return;
    // min delay
    if ((Date.now() - loadTime) / 1000 < CFG.MIN_SUBMIT_SECONDS) {
      statusEl.textContent = "Please take a moment before submitting."; return;
    }

    // validate
    let ok = true;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const review = form.review.value.trim();
    if (name.length < 2) { setError("r-name","Please enter your name."); ok = false; }
    if (!emailRe.test(email)) { setError("r-email","Enter a valid email."); ok = false; }
    if (!rating) { setError("r-rating","Please choose a star rating."); ok = false; }
    if (review.length < 8) { setError("r-review","Tell me a little more (8+ characters)."); ok = false; }
    if (!ok) { form.querySelector(".is-invalid input, .is-invalid textarea, .stars__btn")?.focus(); return; }

    submitBtn.classList.add("is-loading");
    try {
      const payload = {
        formType: "review",
        name, email,
        rating: `${rating} / 5`,
        review,
        company: form.company.value // honeypot (server drops if filled)
      };
      if (window.isLocalPreview()) {
        await new Promise((r) => setTimeout(r, 600)); // no backend locally → demo
      } else {
        const res = await fetch(CFG.EMAIL_ENDPOINT, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        if (!res.ok) {
          if (res.status === 404) throw new Error("The email service isn't deployed yet (endpoint not found). Site owner: deploy api/send.js to Vercel — see README.");
          const data = await res.json().catch(() => null);
          throw new Error((data && data.error) || `Send failed (HTTP ${res.status}).`);
        }
      }

      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      form.reset(); setRating(0); rating = 0;
      statusEl.className = "form-status is-ok";
      statusEl.textContent = "Thank you! Your review was sent privately to Zach.";
      window.toast && window.toast("Review submitted — thank you!");
      submitBtn.disabled = true;
    } catch (err) {
      statusEl.className = "form-status is-err";
      statusEl.textContent = (err && err.message && !/failed to fetch/i.test(err.message))
        ? err.message
        : "Something went wrong — network error. Please try again in a moment.";
    } finally {
      submitBtn.classList.remove("is-loading");
    }
  });
})();
