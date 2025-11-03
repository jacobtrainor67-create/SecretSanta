// Vercel serverless function to send emails via Resend (no extra deps).
const DEFAULT_FROM = process.env.DEFAULT_FROM || "onboarding@resend.dev";

export default async function handler(req, res){
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if(req.method === "OPTIONS") return res.status(200).end();
  if(req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { emails, test } = req.body || {};
  if(!Array.isArray(emails) || emails.length === 0){
    return res.status(400).json({ error: "Missing emails array" });
  }
  if(emails.length > 200){
    return res.status(400).json({ error: "Too many emails in one request (max 200)" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if(!apiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

  try{
    if(test){
      const results = emails.map(e => ({ status: "fulfilled", to: e.to, subject: e.subject, preview: true }));
      return res.status(200).json({ ok:true, test:true, results });
    }

    const tasks = emails.map((e) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: DEFAULT_FROM,
          to: e.to,
          subject: e.subject || "Your Secret Santa match!",
          text: e.text,
          html: e.html || `<p>${(e.text || "").replace(/\n/g, "<br>")}</p>`
        })
      })
      .then(async (r) => {
        if(!r.ok){
          let errText;
          try{ errText = await r.text() } catch{ errText = String(r.status) }
          throw new Error(`Resend error (${r.status}): ${errText}`);
        }
        const data = await r.json().catch(()=>({}));
        return { status:"fulfilled", to:e.to, id:data?.id || null };
      })
      .catch((e) => ({ status:"rejected", to:e.to, reason:e.message || String(e) }))
    );

    const results = await Promise.all(tasks);
    return res.status(200).json({ ok:true, test:false, results });
  }catch(err){
    return res.status(500).json({ error: err.message || String(err) });
  }
}
