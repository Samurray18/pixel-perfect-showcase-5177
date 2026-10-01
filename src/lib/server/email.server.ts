// Resend transactional email. Skipped silently if RESEND_API_KEY isn't set.
export async function sendCodeEmail(to: string, data: { orderNumber: string; product: string; denomination: string; code: string }) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) { console.log("[email] RESEND_API_KEY not set, skipping email for", data.orderNumber); return; }
  const from = process.env["RESEND_FROM"] ?? "ch7nli <onboarding@resend.dev>";
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:auto">
    <h2>Votre code ch7nli / الكود الخاص بك</h2>
    <p>Commande <b>${data.orderNumber}</b> — ${data.product} (${data.denomination})</p>
    <p style="font-size:20px;font-family:monospace;background:#0f172a;color:#fff;padding:16px;border-radius:8px">${data.code}</p>
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: `Votre code — ${data.product}`, html }),
  });
  if (!res.ok) console.error("[email] Resend failed", res.status, await res.text());
}
