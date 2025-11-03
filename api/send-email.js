import nodemailer from "nodemailer";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { emails, test } = req.body || {};
  if (!Array.isArray(emails) || emails.length === 0)
    return res.status(400).json({ error: "Missing emails array" });

  if (test) {
    const results = emails.map(e => ({ status: "fulfilled", to: e.to, preview: true }));
    return res.status(200).json({ ok: true, test: true, results });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASS,
    },
  });

  const results = [];
  for (const e of emails) {
    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: e.to,
        subject: e.subject,
        text: e.text,
        html: e.html || `<p>${(e.text || "").replace(/\n/g, "<br>")}</p>`,
      });
      results.push({ status: "fulfilled", to: e.to });
    } catch (err) {
      results.push({ status: "rejected", to: e.to, reason: err.message });
    }
  }

  res.status(200).json({ ok: true, results });
}
