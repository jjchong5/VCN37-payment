# x402 Pay-Per-Book Library

A working demo of [x402](https://x402.org) — HTTP 402 micropayments — built at
[Vibe Coding Nights #37 "Settlement"](https://luma.com/vcn-37-settlement-build-an-x402-paywall).

A seller server gates `GET /books/:id` behind a **$0.01 USDC** charge on Base
Sepolia (a free testnet). Pay with any wallet, get the full text of a
public-domain book back — no account, no login, no subscription.

## Try it live

Open the hosted demo and connect a wallet (MetaMask or similar):

- **Demo site**: _add your deployed static site URL here once deployed_
- You need: a browser wallet, switched to **Base Sepolia**, holding a small
  amount of testnet USDC. Get free testnet USDC from the
  [Circle USDC faucet](https://faucet.circle.com/) (select Base Sepolia).
- Your private key never leaves your wallet — the page only ever asks you to
  **connect**, never to paste a key.

## How it works

1. Your browser requests `GET /books/:id` with no payment.
2. The server replies `402 Payment Required` with price + payment details.
3. Your wallet signs an EIP-3009 USDC transfer authorization (off-chain
   signature, no gas from you).
4. Your browser retries with that signature in an `X-PAYMENT` header.
5. The server verifies and settles on-chain, then returns the book — with a
   real, verifiable transaction hash linked to BaseScan.

## Repo layout

```
server.js          seller: the actual x402 paywall (Express + x402-express)
data/catalog.json  curated list of public-domain books (id/title/author)
data/books/*.txt   seeded plain-text bodies for the catalog
scripts/           fetch-books.js (seed catalog texts), build-catalog.js (regen catalog from gutendex.com)
site/               public, static, browser-wallet frontend — deploy this anywhere static
demo/               earlier local-only frontend that signs with a server-held test key (npm run demo) — for bigscreen demos using your own funded wallet, not for public hosting
client.js, client-books.js   CLI buyer scripts for /weather and /books
```

## Running locally

```bash
npm install
npm run fetch-books   # seed data/books/ (skips files already downloaded)
npm run server        # seller paywall on http://localhost:4021
```

Then either:

```bash
node client-books.js 84          # CLI buyer, pays from BUYER_PRIVATE_KEY in .env
```

or open `site/index.html` via any static server pointed at your local
seller, e.g.:

```bash
npx http-server site -p 8080
# then visit http://localhost:8080/?seller=http://localhost:4021
```

`.env` needs `PAY_TO_ADDRESS` (your receiving wallet) and, for the CLI buyer
script only, `BUYER_PRIVATE_KEY`. The public `site/` frontend needs neither —
it uses whichever wallet the visitor connects.

## Deploying (Render)

This repo includes a `render.yaml` Blueprint that deploys both pieces:

- `x402-book-seller` — a free Web Service running `server.js`
- `x402-book-demo` — a free Static Site serving `site/`

Steps:

1. Push this repo to GitHub.
2. In the Render dashboard: **New > Blueprint**, point it at your repo.
3. Render will prompt for `PAY_TO_ADDRESS` (the wallet you want to receive
   payments) — this is just a **public wallet address**, e.g. the address
   shown in MetaMask (no private key, no seed phrase). It can be any EVM
   address you control; it doesn't need to be funded ahead of time since
   it's only ever receiving USDC.
4. Once both services are live, note the seller's URL (e.g.
   `https://x402-book-seller.onrender.com`).
5. If it doesn't match `DEFAULT_SELLER_URL` in `site/app.js`, either update
   that constant and redeploy, or just share the demo link with
   `?seller=https://your-actual-seller-url.onrender.com` appended.

If Render's blueprint format has moved on since this was written, the
manual fallback is two clicks: New Web Service (root dir, `npm install`,
`node server.js`) and New Static Site (publish directory `site`).

The build/start commands were validated locally in a clean-room copy of
exactly the git-tracked files (`git archive`), with `npm install --omit=dev`,
no `.env` file, and `PORT`/`PAY_TO_ADDRESS` passed as plain env vars — the
same conditions Render runs under. Catalog, CORS, and the 402 paywall all
behaved correctly.

### Notes on the free tier

- Render's free Web Service spins down when idle — the first request after
  inactivity takes a few extra seconds while it wakes up.
- The "fetch any Gutenberg id on demand" feature in `server.js` writes new
  entries to `data/catalog.json` and `data/books/` at runtime. On Render's
  free tier this disk is **ephemeral** — anything fetched that way resets on
  redeploy/restart. The committed 25-book catalog always persists; on-demand
  additions don't.

## Caveats / what's not here

- This is testnet money (Base Sepolia), not real USDC — see
  `server.mainnet.js` for the mainnet route shape, not wired into the public
  demo here.
- No ERC-8004 identity/reputation gating — anyone with a wallet and testnet
  USDC can buy.
