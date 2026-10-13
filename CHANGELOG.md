# Changelog

## 2026-10-12 — Re-submission corrections

- Require wallet-bound backend sessions and cryptographically verified, expiring,
  single-use authorization for all certificate levels; persist per-wallet limits.
- Use server-configured RPC and Merkle tree; verify devnet genesis and certificate
  account owner, discriminator, recipient and level before minting.
- Restrict three global initializers to the canonical program upgrade authority.
- Add authorization, replay, rate-limit, incomplete-level and global-init regression tests.
- Replace public player solvers with TODO templates; remove the public solver CLI.
- Remove the stale stack/vault-template docs and unsubstantiated partner endorsement
  section; label Breach Rooms as roadmap; add program IDs, setup and submission scripts.

This records source changes. Deployment and recorded-video evidence are separate
checklist items, not completed by making a commit.

## Earlier repository evidence (do not count automatically as new since Frontier)

| Date       | Repository / commit          | Evidence                                      |
| ---------- | ---------------------------- | --------------------------------------------- |
| 2026-05-28 | Backend `5a84c5c`, `11e3d9d` | LiteSVM dependency and lab template packaging |
| 2026-07-02 | Backend `ce57a96`            | Beta access and RL1 funnel analytics          |
| 2026-07-17 | Backend `eec13e2`, `5ec5216` | RL2 and SolBreach explorer implementation     |
| 2026-07-29 | Backend `4a43eae`            | Onboarding responses and RL3 lab              |
| 2026-08-03 | Backend `470acbf`            | RL3 bounty scale and label corrections        |
| 2026-08-14 | Frontend `b5e1d12`           | Breach Room prototype submission integration  |
| 2026-08-20 | Frontend `ae93950`           | Breach Room menu adjustments                  |

The beta UI, backend, frontend modularization, landing and cNFT implementation exist
in this checkout. Their original release dates and the exact Frontier baseline must
be reconciled before presenting them as newly built features. The feedback's
“last commit 2026-08-05” differs from this local frontend branch's 2026-08-20 HEAD.
