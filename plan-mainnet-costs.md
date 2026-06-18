# Plan: Mainnet Settlement Costs & Spam-Drain Risk

Goal: before flipping `server.mainnet.js` on for real, understand what a paid
request actually costs whom, and how fast an unattended/malicious loop could
drain a connected buyer wallet.

## Cost model: who pays what per request

x402 payments are EIP-3009 `transferWithAuthorization` — the buyer **signs**
an authorization off-chain (no gas), and the **facilitator** submits the
on-chain transfer and pays gas. So:

- **Buyer wallet** loses exactly the listed price per request. No gas
  multiplier, no surprise fees on the buyer side — the price string
  (`"$0.001"`, `"$0.01"`) *is* the cost.
- **Facilitator** (whoever runs it) eats the gas cost of settlement.
  - Base mainnet gas is cheap (sub-cent per tx in normal conditions), so
    self-hosting is viable, but it's a real, uncapped operating cost if
    request volume spikes.
  - CDP's hosted facilitator: free first 1,000 tx/month, then $0.001/tx —
    paid by whoever owns the CDP account (the seller), not the buyer.

## Current prices in this repo

| Route | Price | Where |
|---|---|---|
| `/weather` (testnet) | $0.001 | `server.js` |
| `/books/[id]` (testnet) | $0.01 | `server.js` |
| `/weather` (mainnet, Base) | $0.001 | `server.mainnet.js` |
| `/weather/polygon` (mainnet) | $0.001 | `server.mainnet.js` |

`server.mainnet.js` doesn't have a `/books/[id]` mainnet route yet — only
`/weather` is wired for real money.

## Spam-hit math: how many requests to drain a given amount

Since cost-per-hit equals the listed price exactly (no gas on the buyer
side), drain math is just division:

| Target loss | At $0.001/hit (weather) | At $0.01/hit (books) |
|---|---|---|
| $10 | 10,000 hits | 1,000 hits |
| $100 | 100,000 hits | 10,000 hits |
| $500 | 500,000 hits | 50,000 hits |
| $1,000 | 1,000,000 hits | 100,000 hits |

### How fast could that actually happen?

Depends entirely on whether a human has to approve each payment:

- **`site/` (browser wallet, MetaMask)** — each payment requires a wallet
  signature prompt. A human has to click through every single one, so
  draining $100 (100,000 clicks) via this path isn't realistic without the
  user being asleep at the keyboard for an automated clicker — the real
  risk here is closer to "an addicted user clicks buy 50 times by accident,"
  not mass drain.
- **`demo/server.js` (server-side proxy holding `BUYER_PRIVATE_KEY` in
  `.env`)** — **this is the actual risk path.** The server signs and submits
  payments programmatically, with no per-request human approval. A bug that
  causes a retry loop, or a compromised/malicious caller hitting the proxy
  repeatedly, can spend unattended. At Base's ~200ms settlement time, a
  single naive loop could do ~5 req/sec → **$100 in well under a minute**
  at $0.01/hit, or ~5–6 hours at $0.001/hit. A few concurrent connections
  cut that by an order of magnitude.

## Mitigations worth adding before any server holds a mainnet private key unattended

- [ ] Rate limit per route (e.g. `express-rate-limit`) — neither `server.js`
      nor `server.mainnet.js` has this today.
- [ ] Hard spend cap / circuit breaker in whatever holds `BUYER_PRIVATE_KEY`
      (e.g. `demo/server.js`) — track cumulative spend, refuse past a
      threshold per hour/day.
- [ ] Keep the mainnet buyer wallet funded with only what you're willing to
      lose — never the same wallet as a long-term holding wallet.
- [ ] Monitor real settlement volume (x402scan or similar) once live, rather
      than trusting the code to self-limit.

## Out of scope for this pass

- Actually implementing rate limiting / spend caps (tracked as TODOs above).
- ERC-8004 identity gating, which would address a different problem
  (knowing *who* is paying) not this one (how much they can spend).
