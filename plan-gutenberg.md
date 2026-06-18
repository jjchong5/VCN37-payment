# Plan: Pay-Per-Book Gutenberg Library

Goal: extend the existing x402 paywall (`server.js`) with a `/books/:id` endpoint
that serves a public-domain Project Gutenberg book for $0.01 (1 cent), using a
small local subset of texts instead of a full mirror.

## Why a subset, not a full mirror

Full Project Gutenberg is ~70,000 books. Plain-text-only mirror ≈ 40–60GB;
all-formats mirror ≈ 100GB+. A subset of ~100 popular books at 200KB–1MB each
is ~20–80MB and downloads in seconds — plenty for a working demo, expandable later.

## Steps

1. **Pick the book list**
   - Use Project Gutenberg's published "Top 100" list (or hand-pick ~20–50
     well-known out-of-copyright titles) to get a list of Gutenberg book IDs.
   - Store the list as `data/catalog.json`: array of `{ id, title, author }`.

2. **Download the texts**
   - Write `scripts/fetch-books.js`: for each catalog entry, download the
     plain-text UTF-8 version from Gutenberg's standard URL pattern
     (`https://www.gutenberg.org/cache/epub/<id>/pg<id>.txt`) and save to
     `data/books/<id>.txt`.
   - Respect Gutenberg's mirror/robot rules: add a small delay between
     requests (e.g. 1–2s) and a descriptive User-Agent; don't parallelize
     aggressively since this is a one-time seed, not a live mirror.
   - Run once locally to seed `data/books/`; these files get committed (or
     gitignored + fetched on setup — see Open Questions).

3. **Wire the paywalled route in `server.js`**
   - Add `/books/:id` to the `paymentMiddleware` config, price `$0.01`,
     network `base-sepolia` (test money, per current phase).
   - Route handler: read `data/books/<id>.txt` from disk, return as
     `text/plain` (or wrap in JSON with title/author metadata). 404 if the
     id isn't in the local catalog.
   - Add a free, unpaywalled `/books` route that lists the catalog
     (id/title/author only, no body text) so buyers know what's available
     before paying.

4. **Update `client.js` (or add `client-books.js`)**
   - Buyer-side script that fetches `/books` (free) to pick an id, then
     fetches `/books/:id` through `wrapFetchWithPayment` to pay and download.

5. **Docs**
   - Update `TODO.md` / `CLAUDE.md` once built: note the `/books/:id` route,
     the subset size actually used, and that mainnet real-money payment for
     this route is Phase 2 (per existing `server.mainnet.js` split).

## Open questions to resolve when resuming

- Exact subset size: start with ~20 books for the fastest demo, can grow to
  ~100 later without changing the design.
- Commit `data/books/*.txt` to git, or gitignore and re-run
  `fetch-books.js` as a setup step? (Texts are public domain, so committing
  is legally fine — mainly a repo-size tradeoff.)
- Whether `/books/:id` price should vary by book length, or stay flat at 1¢
  for simplicity (recommend flat for now).

## Out of scope for this pass

- Full Gutenberg mirror.
- ERC-8004 identity/reputation gating on book purchases (tracked separately
  in main `CLAUDE.md` as not-yet-implemented).
- Mainnet/real-money payment (Phase 2).
