// Shared Reloadly OAuth + catalog access. Tokens are cached in module scope
// because /products runs hundreds of requests during a sync.
const TOKEN_TTL_MS = 25 * 60 * 1000;

let cached: { token: string; expiresAt: number } | null = null;

export function reloadlyConfigured() {
  return Boolean(process.env["RELOADLY_CLIENT_ID"] && process.env["RELOADLY_CLIENT_SECRET"]);
}

export function reloadlyBaseUrl() {
  return process.env["RELOADLY_SANDBOX"] !== "false"
    ? "https://giftcards-sandbox.reloadly.com"
    : "https://giftcards.reloadly.com";
}

export async function reloadlyAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const res = await fetch("https://auth.reloadly.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env["RELOADLY_CLIENT_ID"],
      client_secret: process.env["RELOADLY_CLIENT_SECRET"],
      grant_type: "client_credentials",
      audience: reloadlyBaseUrl(),
    }),
  });
  if (!res.ok) throw new Error(`Reloadly auth failed: ${res.status}`);
  const { access_token } = (await res.json()) as { access_token: string };
  cached = { token: access_token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return access_token;
}

export async function reloadlyFetch(path: string): Promise<unknown> {
  const res = await fetch(`${reloadlyBaseUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${await reloadlyAccessToken()}`,
      Accept: "application/com.reloadly.giftcards-v1+json",
    },
  });
  if (!res.ok) throw new Error(`Reloadly ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}
