# Decentralized Euro Documentation

Source for [docs.dEURO.com](https://docs.dEURO.com), built with [VuePress](https://v1.vuepress.vuejs.org/).

The documentation explains how to interact with the Decentralized Euro (dEURO) protocol — an oracle-free, over-collateralized EUR stablecoin on Ethereum mainnet. For the protocol itself, see [d-EURO/smartContracts](https://github.com/d-EURO/smartContracts).

## Local development

```bash
npm ci
NODE_OPTIONS=--openssl-legacy-provider npm start   # dev server on http://localhost:8080
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

`--openssl-legacy-provider` is required because VuePress 1 uses an old Webpack toolchain that is incompatible with Node 17+ defaults. CI pins Node 16 and does not need the flag.

## Repository layout

```
src/
├── index.md           Table of contents
├── overview.md        Introduction to dEURO and nDEPS
├── swap.md            Stablecoin bridges
├── positions.md       Collateralized minting overview
├── positions/         Position lifecycle pages
├── reserve.md         Reserve structure
├── reserve/           Pool shares
├── savings.md         Savings module
├── frontend-rewards.md Referral rewards (V2)
├── governance.md      nDEPS governance
├── smart-contracts.md Contract reference
├── smart-contracts/   Function reference
├── telegram-api-bot.md Notification bot
├── disclaimer.md, privacy.md, imprint.md
└── faq.md
```

## Deployment

| Branch | Cloudflare Pages project | URL |
|---|---|---|
| `develop` | `deuro-docs-dev` | preview |
| `main` | `deuro-docs-prd` | https://docs.dEURO.com |

`develop` → `main` releases are opened automatically by the `Auto Release PR` workflow.

## Contributing

PRs target `develop`. Each push to `develop` triggers a Cloudflare Pages preview deploy; merging `develop` → `main` deploys production.
