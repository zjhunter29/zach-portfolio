/* =========================================================
   api/send.js — Resend email endpoint (Vercel serverless function)
   Handles BOTH the contact form and the review form (JSON POST).

   Your secret API key NEVER lives in the website code — it lives
   here on the server, read from an environment variable.

   Set these in Vercel → Project → Settings → Environment Variables
   (this is where you "paste the key" when you're ready):

     RESEND_API_KEY    (required)  your Resend key, e.g. re_xxxxxxxx
     CONTACT_TO_EMAIL  (required)  inbox that receives form emails
     RESEND_FROM       (optional)  verified sender, e.g. "Zach <forms@yourdomain.com>"
                                   defaults to onboarding@resend.dev for quick testing
     ALLOW_ORIGIN      (optional)  lock CORS to your site origin in production,
                                   e.g. https://zjhunter29.github.io  (defaults to *)

   No npm install needed — this calls the Resend REST API with fetch.
   ========================================================= */
"use strict";

module.exports = async (req, res) => {
  const allowOrigin = process.env.ALLOW_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Email not configured: set RESEND_API_KEY." });
  const to = process.env.CONTACT_TO_EMAIL;
  if (!to) return res.status(500).json({ error: "Email not configured: set CONTACT_TO_EMAIL." });
  const from = process.env.RESEND_FROM || "Portfolio <onboarding@resend.dev>";

  // body may arrive parsed (object) or raw (string)
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  // spam: honeypot fields must be empty (contact uses "website", review uses "company")
  if (body.website || body.company) return res.status(200).json({ ok: true });

  const esc = (s) => String(s == null ? "" : s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const nl = (s) => esc(s).replace(/\n/g, "<br>");

  const email = String(body.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Invalid email address." });
  const name = (String(body.name || "").trim() || "Anonymous").slice(0, 120);
  const isReview = body.formType === "review";

  let subject, html;
  if (isReview) {
    const rating = String(body.rating || "").slice(0, 16);
    subject = `New review from ${name} (${rating})`;
    html = `<h2 style="font-family:sans-serif">New review</h2>
      <p><b>Name:</b> ${esc(name)}</p>
      <p><b>Email:</b> ${esc(email)}</p>
      <p><b>Rating:</b> ${esc(rating)}</p>
      <p><b>Review:</b><br>${nl(String(body.review || "").slice(0, 4000))}</p>`;
  } else {
    const subj = (String(body.subject || "").trim() || "New enquiry").slice(0, 200);
    subject = `Portfolio enquiry: ${subj}`;
    html = `<h2 style="font-family:sans-serif">New contact enquiry</h2>
      <p><b>Name:</b> ${esc(name)}</p>
      <p><b>Email:</b> ${esc(email)}</p>
      <p><b>Service:</b> ${esc(body.service)}</p>
      <p><b>Budget:</b> ${esc(body.budget)}</p>
      <p><b>Subject:</b> ${esc(subj)}</p>
      <p><b>Message:</b><br>${nl(String(body.message || "").slice(0, 8000))}</p>`;
  }

  const payload = { from, to: [to], reply_to: email, subject, html };

  // optional attachment from the contact form: { filename, content (base64) }
  if (body.attachment && body.attachment.content && body.attachment.filename) {
    payload.attachments = [{
      filename: String(body.attachment.filename).slice(0, 200),
      content: String(body.attachment.content)
    }];
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return res.status(502).json({ error: "Email send failed.", detail: detail.slice(0, 300) });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: "Email send failed." });
  }
};
