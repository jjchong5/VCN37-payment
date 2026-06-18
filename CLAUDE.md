# VCN #37: Settlement — Build an x402 Paywall

Event context for this repo. Workshop attended 2026-06-17, Frontier Tower Floor 9 Annex, SF.

## Event

- **Series**: Vibe Coding Nights (VCN), hosted by Frontier Tower SF
- **This session**: VCN #37 "Settlement" — wiring the *seller* side of x402 (HTTP 402 micropayments) plus ERC-8004 agent identity
- **Date/location**: Wed Jun 17 2026, 7:00–10:00 PM, Frontier Tower @ 9th Floor Annex, 995 Market St, SF
- **Luma RSVP**: https://luma.com/vcn-37-settlement-build-an-x402-paywall
- **Hosts**: Rayyan Zahid (Immersive Commons), Michalis Vasileiadis (Otto / GSD2.0), Eric Mockler (F11 Health & Longevity), Devinder Sodhi (Frontier Tower lead)
- **Org site**: https://www.immersivecommons.com (events listing: `/events`; past workshop decks: `/presentations`)

## Tutorial / slide deck status

As of event night, no published deck/tutorial page was found yet for #37 (unlike prior weeks).
- Pattern from past weeks: each VCN gets a slide deck at `https://vcn-<N>-<slug>.vercel.app/`, indexed at `https://www.immersivecommons.com/presentations/vcn-<N>-<slug>`.
  - #36 Crosstalk: https://vcn-36-crosstalk.vercel.app/
  - #35 Well-Known: https://vcn-35-well-known.vercel.app/
  - #34 Toolsmith: https://vcn-34-toolsmith.vercel.app/
  - #33 Total Recall: https://vcn-33-total-recall.vercel.app/
- Guessed #37 URL `https://vcn-37-settlement.vercel.app/` returned 404 as of 2026-06-17 ~8PM — likely posted live during/after the talk. Check `/presentations` again, or ask hosts.
- Live deck viewed in-session covered: thirty-line Express paywall, paying from a Base Sepolia testnet wallet, ERC-8004 identity (Identity/Reputation/Validation registries), and a 30-second autonomous agent loop (discover → pay → get response).

## What x402 / ERC-8004 are

- **x402**: Coinbase-incubated open protocol reviving HTTP 402 Payment Required. Server returns 402 + payment details; client retries with an `X-PAYMENT` header (EIP-3009 signed USDC/EURC, or Permit2). Runs on Base, Polygon, Arbitrum, World, Solana. Free tier 1,000 tx/month, then $0.001/tx. Base settlement ~200ms.
- **ERC-8004**: on-chain identity/trust layer for agents (three registries: Identity, Reputation, Validation) — answers "who is calling my paywall, and can their wallet be trusted." Intentionally orthogonal to x402 (x402 = money, ERC-8004 = trust).

## This repo's build pathway

Seller-side paywall demo, following the live workshop flow:
1. `server.js` — Express app, `paymentMiddleware` from `x402-express` gates `GET /weather` behind a $0.001 charge on `base-sepolia`, paid to `PAY_TO_ADDRESS` (from `.env`). Returns 402 unpaid, 200 + JSON once paid.
2. `client.js` — buyer-side agent script using `viem` + `x402-fetch`'s `wrapFetchWithPayment` to sign and pay from `BUYER_PRIVATE_KEY` (Base Sepolia testnet wallet), then fetch `/weather`.
3. `.env` (gitignored) holds `PAY_TO_ADDRESS` and `BUYER_PRIVATE_KEY` — get free testnet USDC from the Base Sepolia faucet.

Run: `node server.js` in one terminal, `node client.js` in another — buyer agent should get a 402, pay, and receive the weather JSON.

### Pay-per-book Gutenberg library (built per `plan-gutenberg.md`)

- `data/catalog.json` — 25 hand-picked public-domain titles (id/title/author). Deliberately kept small (not the full ~70k-book Gutenberg corpus, which would run 40GB+) — see `plan-gutenberg.md` for the size/scope reasoning.
- `data/books/<id>.txt` — seeded plain-text bodies for the 25-book catalog, ~13MB total. Re-seed with `npm run fetch-books` (= `node scripts/fetch-books.js`; skips files that already exist).
- `scripts/build-catalog.js` — generates a larger catalog (currently set to top 500) from the gutendex.com API, sorted by popularity, filtered to books with a `text/plain` format. Was run once to test a 500-book catalog, then **reverted to the curated 25-book list** for the demo — script is kept in the repo for whenever the catalog should grow again, but isn't part of the current run path.
- `server.js` adds `GET /books` (free catalog listing) and `GET /books/[id]` ($0.01 on `base-sepolia`, returns `{id, title, author, text}` once paid).
- **Auto-fetch on miss**: requesting `/books/[id]` for an id not in `data/catalog.json` (or seeded but missing its `.txt`) no longer 404s — the handler fetches it live from `gutenberg.org`, caches it to `data/books/<id>.txt`, parses title/author from Gutenberg's standard header line, appends it to `catalog.json`, and serves it. This matters because payment is taken by the `paymentMiddleware` *before* the route handler runs, so a bare 404 would have charged the buyer for nothing.
- **Gotcha**: x402-express route patterns are NOT Express `:param` syntax — they use a custom glob (`[name]` for one path segment, `*` for wildcard), matched via regex in `node_modules/x402/dist/cjs/shared/index.js`'s `computeRoutePatterns`/`findMatchingRoute`. Writing `/books/:id` in the `paymentMiddleware` config silently fails to match anything except the literal string `/books/:id`, so the route serves for free with no warning. Use `/books/[id]` instead.
- `client-books.js` — CLI buyer script: fetches `/books` free, then pays for `node client-books.js <id>` (defaults to the first catalog entry).
- Verified end-to-end on 2026-06-17: paid $0.01 USDC on Base Sepolia for id 84 (Frankenstein) and received the full text.

### Browser demo frontends

Two buyer-facing UIs were built on top of the same seller (`server.js`); they're separate experiments, not a pipeline:

- `demo/` — earlier version. `demo/server.js` is a small Express app (run via `npm run demo`, port 5050) that serves `demo/public/` and proxies the buy flow server-side using `BUYER_PRIVATE_KEY` from `.env` (the demo server itself holds the buyer wallet key and signs payments). See `demo/TUTORIAL.md` for the full walkthrough and live-demo talking points.
- `site/` — later, fully static version: a plain HTML/CSS/JS page (no server, no private key in `.env`) that connects the visitor's own browser wallet (MetaMask via `window.ethereum`), switches them to Base Sepolia, and signs/pays directly from their wallet. Defaults to seller URL `https://x402-book-seller.onrender.com` (overridable via `?seller=` query param or the in-page Settings panel), so it's meant to be deployed standalone (e.g. static hosting) pointed at a separately-deployed seller. `server.js`'s CORS middleware (`exposedHeaders: ["X-PAYMENT-RESPONSE"]`) exists specifically to support this — a statically-hosted `site/` calling the seller cross-origin.
- `render.yaml` — Render blueprint matching that split: `x402-book-seller` (Node web service running `server.js`, needs `PAY_TO_ADDRESS` set in Render's dashboard) and `x402-book-demo` (static site publishing `./site`). `PAY_TO_ADDRESS` is just a public wallet address (e.g. the address shown in MetaMask) — never a private key.
- Validated the Render build/start path locally on 2026-06-17 via `git archive HEAD` into a clean temp dir, then `npm install --omit=dev` + `PORT=10000 PAY_TO_ADDRESS=... node server.js` with no `.env` file present — matches what Render's free Node web service actually runs. Catalog (`/books`), CORS preflight, and 402 gating on `/books/:id` and `/weather` all worked. Actual deploy (GitHub OAuth + Render dashboard) still needs to happen in the user's Render account — not something Claude can do directly.

Not yet implemented here: ERC-8004 identity/reputation check before serving, and the 30-second autonomous discover-pay-loop demoed live.
