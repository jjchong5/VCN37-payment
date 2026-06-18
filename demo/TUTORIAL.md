# Demo Tutorial: Pay-Per-Book x402 Library

A bigscreen-friendly frontend for the `/books/:id` paywall. Shows an AI buyer
agent paying $0.01 in USDC on Base Sepolia, in real time, to unlock a book.

## What it demonstrates

- HTTP 402 as an actual payment flow, not just a status code.
- A buyer "agent" (a wallet + script, no login/credit card) paying per request.
- Real on-chain settlement — every purchase links to a verifiable BaseScan tx.

## Prerequisites

- `.env` already has `PAY_TO_ADDRESS` and `BUYER_PRIVATE_KEY` set (see root `CLAUDE.md`).
- The buyer wallet (`BUYER_ADDRESS` in `.env`) needs testnet USDC on Base Sepolia.
  Get some free from the [Base Sepolia faucet](https://faucet.circle.com/) if purchases fail.
- Book texts are seeded: `npm run fetch-books` (one-time, skips files already downloaded).

## Running the demo

Two servers, two terminals:

```bash
# Terminal 1 — the seller (the paywall itself)
npm run server
# → Paywall live on http://localhost:4021

# Terminal 2 — the buyer-facing demo frontend
npm run demo
# → Demo frontend live on http://localhost:5050
```

Open **http://localhost:5050** on the bigscreen / shared browser.

## What's on screen

- A grid of public-domain books (free to browse — this list comes from the
  seller's unpaywalled `GET /books`).
- Click **"Buy for $0.01"** on any book. The page walks through the real
  x402 steps with status messages (request → 402 → sign payment → settle),
  then opens the book with a green payment receipt showing the actual
  on-chain transaction hash, linked to BaseScan Sepolia.
- **"How does this work?"** button at the top expands a plain-language
  explanation of the five-step x402 handshake — useful to leave open while
  narrating to an audience.

## Talking points for a live demo

1. Click a book, point out the 402 → sign → settle staging messages — this
   is the real request lifecycle, not a fake animation; the actual server
   round trip is happening underneath.
2. Click the transaction hash link once the book opens — show the real,
   independently-verifiable settlement on Base Sepolia's explorer.
3. Buy a second, different book to show the price is per-request, not a
   subscription — there's no session or login state anywhere in this flow.
4. Mention: same architecture works for any per-call resource (an API call,
   a weather lookup — see `/weather` in the main paywall) — books are just
   a vivid, human-readable example of metered pay-per-use.

## Troubleshooting

- **"Payment amount exceeds maximum allowed"**: the demo buyer wallet is
  empty or below the faucet minimum — fund `BUYER_ADDRESS` again.
- **Catalog loads but buying hangs**: check Terminal 1 (seller) is still
  running and reachable at `http://localhost:4021` — the demo server proxies
  through it.
- **Book text missing for a known id**: re-run `npm run fetch-books`; it
  skips already-downloaded files so it's safe to re-run anytime.
