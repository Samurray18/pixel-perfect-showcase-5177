# ch7nli — Gift cards & game top-ups (Algeria)

Storefront (FR/AR, RTL), checkout via Chargily Pay (Edahabia/CIB), automatic fulfillment via Reloadly, encrypted code storage, Resend emails, and an admin at `/admin`.

## Environment variables (server secrets)
| Name | Purpose |
|---|---|
| `CODES_ENCRYPTION_KEY` | AES-GCM key for delivered codes (already generated) |
| `CHARGILY_SECRET_KEY` | `test_sk_…` or `live_sk_…`. Without it, orders run in test mode with a "simulate payment" button |
| `RELOADLY_CLIENT_ID` / `RELOADLY_CLIENT_SECRET` | Reloadly gift-card API. Without them, a mock provider issues `TEST-…` codes |
| `RELOADLY_SANDBOX` | `false` for production Reloadly (default sandbox) |
| `RESEND_API_KEY`, `RESEND_FROM` | Code emails (optional) |

## Chargily webhook
Set the webhook URL in Chargily to `https://<your-domain>/api/public/chargily-webhook`.

## Reloadly mapping
In `/admin → Produits`, fill each denomination's Reloadly product ID and unit price.

## Admin
The first account created at `/admin` becomes admin automatically.

## Code layout
- `src/lib/server/payments.server.ts` — Chargily
- `src/lib/server/fulfillment.server.ts` — `FulfillmentProvider` interface (Reloadly + mock)
- `src/lib/server/orders.server.ts` — pay → fulfill → encrypt → email
- `src/lib/orders.functions.ts` — server functions used by the UI
