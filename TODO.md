# TODO

- [x] Decide what `/weather`-equivalent route should actually do. Resolved:
      built a pay-per-book Gutenberg library (`/books`, `/books/[id]`) as the
      real paywalled resource — see `CLAUDE.md` and `plan-gutenberg.md`.
      `server.mainnet.js` still serves the original hardcoded `/weather`
      stub, since mainnet/real-money is explicitly Phase 2 (not built yet).
- [ ] ERC-8004 identity/reputation check before serving a book.
- [ ] 30-second autonomous discover-pay-loop (demoed live at the workshop,
      not built in this repo).
- [ ] Decide whether to grow `data/catalog.json` past 25 books later using
      `scripts/build-catalog.js` (already wired for a top-500 pull from
      gutendex.com) — explicitly deferred for now to keep the demo small.
- [ ] Phase 2: wire `server.mainnet.js` for real-money payment once the
      testnet flow above is fully comfortable.
- [ ] Add rate limiting / spend caps before any mainnet server holds a buyer
      private key unattended (e.g. `demo/server.js`'s `BUYER_PRIVATE_KEY`
      pattern) — see `plan-mainnet-costs.md` for the drain-risk math.
