/* =========================================================
   contact.js — contact form with validation + Formbold submit
   Spam protection: honeypot field + minimum submission delay.
   ========================================================= */
(() => {
  const CFG = window.SITE_CONFIG;
  const form = document.getElementById("contactForm");
  if (!form) return;

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const statusEl = document.getElementById("contactStatus");
  const submitBtn = document.getElementById("contactSubmit");
  const fileInput = document.getElementById("c-file");
  const fileLabel = document.getElementById("fileLabel");
  const drop = form.querySelector(".filedrop");
  const MAX_FILE = 10 * 1024 * 1024; // 10MB
  const loadTime = Date.now();

  /* ---------- validation helpers ---------- */
  const setError = (id, msg) => {
    const f = document.getElementById(id).closest(".field");
    f.classList.add("is-invalid");
    const e = form.querySelector(`[data-error-for="${id}"]`); if (e) e.textContent = msg;
  };
  const clearError = (id) => {
    const f = document.getElementById(id).closest(".field");
    f.classList.remove("is-invalid");
    const e = form.querySelector(`[data-error-for="${id}"]`); if (e) e.textContent = "";
  };
  const validators = {
    "c-name":   (v) => v.trim().length >= 2 || "Please enter your name.",
    "c-email":  (v) => emailRe.test(v.trim()) || "Enter a valid email address.",
    "c-service":(v) => !!v || "Please choose a service.",
    "c-subject":(v) => v.trim().length >= 3 || "Add a short subject.",
    "c-message":(v) => v.trim().length >= 10 || "Tell me a bit more (10+ characters)."
  };
  const validateField = (id) => {
    const el = document.getElementById(id);
    const res = validators[id](el.value);
    if (res === true) { clearError(id); return true; }
    setError(id, res); return false;
  };

  // inline validation on blur + clear on input
  Object.keys(validators).forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("blur", () => validateField(id));
    el.addEventListener("input", () => clearError(id));
    el.addEventListener("change", () => clearError(id));
  });

  /* ---------- file upload UX ---------- */
  const showFile = (file) => {
    if (!file) { fileLabel.innerHTML = "Drop a file or <u>browse</u>"; return; }
    if (file.size > MAX_FILE) {
      fileInput.value = "";
      fileLabel.textContent = "File too large (max 10MB).";
      return;
    }
    fileLabel.textContent = `${file.name} · ${(file.size / 1048576).toFixed(1)}MB`;
  };
  fileInput.addEventListener("change", () => showFile(fileInput.files[0]));
  ["dragenter","dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-drag"); }));
  ["dragleave","drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-drag"); }));
  drop.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files[0];
    if (f) { fileInput.files = e.dataTransfer.files; showFile(f); }
  });

  /* ---------- submit ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.className = "form-status";

    // honeypot — silently drop bots
    if (form.website.value) return;
    // minimum delay
    if ((Date.now() - loadTime) / 1000 < CFG.MIN_SUBMIT_SECONDS) {
      statusEl.textContent = "Please take a moment before sending.";
      return;
    }

    // validate all
    let firstBad = null;
    Object.keys(validators).forEach((id) => {
      if (!validateField(id) && !firstBad) firstBad = id;
    });
    if (firstBad) {
      statusEl.className = "form-status is-err";
      statusEl.textContent = "Please fix the highlighted fields.";
      document.getElementById(firstBad).focus();
      return;
    }

    submitBtn.classList.add("is-loading");
    submitBtn.disabled = true;
    try {
      const fd = new FormData(form);
      fd.delete("website"); // strip honeypot
      fd.append("formType", "contact");
      fd.append("_subject", `New project enquiry: ${form.subject.value}`);
      if (!fileInput.files.length) fd.delete("attachment");

      if (window.isEndpointConfigured()) {
        const res = await fetch(CFG.FORMBOLD_ENDPOINT, { method:"POST", body: fd, headers:{ Accept:"application/json" } });
        if (!res.ok) throw new Error("Submission failed");
      } else {
        await new Promise((r) => setTimeout(r, 800)); // demo mode
        console.warn("[contact] Formbold endpoint not set — running in demo mode. Add it in js/app.js.");
      }

      form.reset();
      showFile(null);
      statusEl.className = "form-status is-ok";
      statusEl.textContent = "Message sent! I'll get back to you within 24 hours.";
      window.toast && window.toast("Message sent successfully!");
    } catch (err) {
      statusEl.className = "form-status is-err";
      statusEl.textContent = "Couldn't send right now. Please try again or email hello@zach.studio.";
    } finally {
      submitBtn.classList.remove("is-loading");
      submitBtn.disabled = false;
    }
  });
})();
