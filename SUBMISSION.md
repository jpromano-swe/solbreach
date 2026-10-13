# Colosseum re-submission packet — 2026-10-12

## Project description (English)

SolBreach helps Solana builders learn to spot security bugs by exploiting vulnerable
programs and explaining the fix. Builders inspect account relationships, construct
an attempt, verify impact, and track wallet-linked completion. The beta includes
vulnerability modules and Research Labs; cohort-oriented Breach Rooms remain in development.

**What's new since Frontier:** The October 12 re-submission patch adds wallet-bound,
single-use certificate mint authorization, server-controlled devnet mint configuration,
restricted global initialization, learner templates, and evidence-based documentation.
See CHANGELOG.md for earlier milestones; do not count those as new without the prior
submission baseline.

**Stack:** Next.js, React, TypeScript, Tailwind CSS; Python/FastAPI, PostgreSQL,
SQLAlchemy and Alembic; Rust/Anchor on Solana devnet; Solana Kit/web3.js and Metaplex
Bubblegum cNFTs. LiteSVM is used in on-chain regression tests and an optional RL1
backend adapter. Other backend lab flows include deterministic modeled verification.

**Initial segment and go-to-market:** Start with Solana developers learning program
security and cohort educators. Recruit through developer communities, run guided
beta sessions, observe completion and learner explanations, and use those findings
to validate a paid cohort offering. This is the proposed acquisition and pricing
validation plan, not evidence of signed partnerships or paying customers.

**Team and location:** Juan Pablo Romano — Buenos Aires, Argentina.

**Evidence discipline:** No verified interview dataset, profile breakdown, three
interview findings, workshop date, commercial price, or partnership confirmation is
provided in this repository. Do not publish “20 interviews”, Turbine/Dev3Pack
partnerships, or traction figures without supporting material. Add an anonymized
research summary only after reconciling the underlying records.

## Demo recording — target 2:40, maximum 3:00

| Time      | Narration / screen                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0:00–0:10 | “A Solana builder learns to spot an unchecked account by exploiting it.” Show the beta and the devnet label.                                     |
| 0:10–0:40 | Open Level 1 source. Explain the expected mint relationship and the missing validation in `deposit_tokens`.                                      |
| 0:40–1:30 | Construct the attempt, show the accounts used, sign with the learner wallet, and show changed state.                                             |
| 1:30–2:05 | Submit `verify_and_close_level_1`. Open the actual successful transaction in Solana Explorer with `cluster=devnet`; show signer and instruction. |
| 2:05–2:30 | Claim/mint the certificate; sign the authorization message. Show the actual cNFT in the wallet or a supported asset viewer.                      |
| 2:30–2:40 | State the fix: constrain account/mint relationships. Label Breach Rooms “in development”.                                                        |

Keep the transaction signature and asset address from the actual recording. Never
substitute a backend simulation or placeholder Explorer link for a public devnet exploit.

## Pitch recording — target 1:50, maximum 2:00

**0:00–0:20 — Problem.** “A developer can understand a Solana vulnerability in theory
and still miss it in a real program. The difficult part is connecting source code,
account relationships, and transaction behavior.”

**0:20–0:35 — Insight.** “We turn that gap into a concrete learning task: exploit the
missing check, observe its impact, then explain how to fix it.”

**0:35–1:00 — Product.** “SolBreach is an interactive security training beta for Solana
builders. It combines guided vulnerability modules, Research Labs, wallet-linked
progress, and completion certificates. Here is the Level 1 account-substitution flow.”

**1:00–1:20 — Evidence.** Show the real exploit transaction, completion state and cNFT.
“Our evidence today is the running beta and this reproducible workflow.” Add usage
or interview figures only if reconciled against supporting records.

**1:20–1:40 — Segment and business.** “We are starting with Solana builders and cohort
educators. Our next commercial experiment is paid cohort training. Pricing is still
to be validated with those users.”

**1:40–1:55 — Team and next milestone.** “I'm Juan Pablo Romano, building SolBreach
from Buenos Aires, Argentina. The next milestone is a measured cohort pilot: track
completion, assess the quality of learners' explanations, and validate willingness
to pay.”

## Required before sending (not completed by this commit)

- [ ] Apply backend migration, deploy backend/frontend, and upgrade the devnet program;
      verify the deployed version contains these changes.
- [ ] Record and upload the real exploit demo; paste its public/unlisted URL here.
- [ ] Record and upload the English pitch; paste its public/unlisted URL here.
- [ ] Open both videos in a private browser window and verify duration/playback.
- [ ] Verify successful devnet transaction and cNFT in the video.
- [ ] Push both repository commits and verify anonymous repository access.
- [ ] Set project country and entrant country to Argentina; city to Buenos Aires.
- [ ] Keep all application fields in English; set repository visibility accurately.
- [ ] Add the actual Colosseum project URL to the chapter/Earn application.
- [ ] Submit in Colosseum, then Superteam Earn; save both confirmation screenshots.

The supplied review states a deadline of **2026-10-13 03:59 ART**. This is copied
from that feedback, not independently verified against the live submission portals.
