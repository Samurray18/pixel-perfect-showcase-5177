# Snapchat+ — Upgrade your Snapchat

A single-page storefront that showcases Snapchat+ features. Every purchase
button opens the **official** Snapchat+ page (`https://www.snapchat.com/plus`)
in a new tab. No payment details are collected here.

## Routes

- `/` — Snapchat+ landing page
- `/snapplus` — redirects to `/`

## Stack

- TanStack Start + React 19
- Tailwind CSS v4 (app shell / error pages)
- Standalone page assets in `src/snapplus/`
  - `page.html` — page markup (injected into the route)
  - `styles.css` — Snapchat-yellow/ink design
  - `script.js` — sticky header, mobile menu, FAQ accordion, scroll reveals
  - `favicon.svg` — ghost favicon

## Commands

```bash
npm install
npm run dev      # local dev server
npm run build    # production build
npm run test     # vitest
```

## Purchase link

Every "Get Snapchat+", "Subscribe on Snapchat" and footer link points to:

```
https://www.snapchat.com/plus
```

## Disclaimer

This is an independent feature guide. It is not affiliated with Snap Inc.
Snapchat and Snapchat+ are trademarks of Snap Inc. All subscriptions are sold
by Snapchat itself.
