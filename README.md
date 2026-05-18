# SolBreach

## Gamified Web3 security training for Solana

SolBreach is an interactive CTF platform for learning offensive and defensive Solana program security. Developers exploit intentionally vulnerable Anchor programs on devnet, verify objectives on-chain, and mint wallet-bound cNFT certifications for completed levels.

This repository contains the SolBreach web app, Anchor challenge programs, cNFT certification flow, and operator tooling used to run and verify levels on devnet.

## The Problem

Solana developers need security training that matches the SVM execution model. Ethereum-focused training environments do not teach account validation, PDA authority, CPI boundaries, signer constraints, or transaction UX in the way Solana programs actually fail.

Today, many developers learn these patterns from scattered audit reports, docs, and postmortems. SolBreach turns those concepts into a persistent hands-on environment where players can practice real exploit workflows safely.

## The Solution

SolBreach is an open-source security wargame modeled on Ethernaut, but designed natively for Solana and Anchor. Players connect a wallet, inspect vulnerable code, run exploits from a playground repo, verify progress on-chain, and collect verifiable certifications.

### Core architecture

- **Rent-refund PDAs:** Players initialize per-level PDAs and recover rent when a level is verified and closed.
- **Wallet-bound progress:** Completion state is tracked through Solana accounts tied to the player wallet.
- **Metaplex cNFT certifications:** Completed levels can mint compressed NFT credentials through Bubblegum.
- **Exploit verification:** The web app checks on-chain state transitions and level win conditions before certification.

## Curriculum

The current devnet build includes the warmup plus three exploit levels:

| Level | Name | Concept | Vulnerability |
| --- | --- | --- | --- |
| 0 | Hello SolBreach | Player registry | PDA setup, completion, and closeout flow |
| 1 | The Illusionist | Account substitution | Missing constraints allow counterfeit token accounts |
| 2 | Identity Thief | PDA authority bypass | Static seeds let any signer overwrite shared state |
| 3 | Trojan Horse | Arbitrary CPI | Unchecked external program invocation enables delegated abuse |

## Player Workflow

1. Connect a wallet to the SolBreach web app.
2. Open a level and inspect the lore, hints, and vulnerable snippet.
3. Clone the external SolBreach Playground repository.
4. Run the exploit locally against the devnet program.
5. Return to the web app to verify progress and mint the cNFT certification.

## Traction

SolBreach is still early-stage. The current evidence of progress is product shipping rather than broad user adoption:

- Live Vercel demo for the web app.
- Public repository with Anchor programs, frontend, player scripts, and cNFT tooling.
- Separate player playground repository for the exploit workflow.
- Devnet deployment with working level verification and certification minting.

The next validation milestone is to run public playtests with Solana developers, audit learners, and hackathon teams, then publish completion rates, feedback, and learner outcomes.

## Building in Public

The project is moving toward a more visible development cadence:

- Publish level writeups and postmortems for new vulnerability classes.
- Share progress updates around devnet deployments, case studies, and review-room training.
- Track roadmap items in public issues where practical.
- Invite security reviewers and Solana developers to test levels and propose new scenarios.

## Adoption Path

SolBreach is built for:

- Solana developers learning secure Anchor patterns.
- Audit learners practicing exploit reasoning and remediation.
- Hackathon teams preparing protocols before launch.
- Protocol teams onboarding engineers to Solana security workflows.
- Security teams training reviewers through structured findings and review rooms.

The core CTF can remain free and open-source. Potential paid paths include team training environments, reviewer assessment rooms, certification programs, and protocol-sponsored case studies based on real incidents.

## Tech Stack

- Smart contracts: Rust, Anchor Framework
- Frontend: Next.js, React, Tailwind CSS
- Solana integration: `@solana/kit`, Wallet Standard, `@solana/web3.js`
- Certifications: Metaplex Umi and Bubblegum
- Testing: Cargo tests and local player scripts

## Current Status

- [x] Anchor challenge program live on devnet
- [x] Levels 0-3 implemented and tested
- [x] Web board, level pages, and profile gallery shipped
- [x] Metaplex Bubblegum cNFT certifications working on devnet
- [x] External playground repo ready for player exploit flow
- [ ] Public playtest metrics and community traction evidence
- [ ] Production-ready modular frontend architecture
- [ ] Mainnet deployment plan and safeguards

## Repositories

- Web app + contracts: `https://github.com/jpromano-swe/solbreach`
- Player playground: `https://github.com/jpromano-swe/solbreach-playground`

Built for Solana by the SolBreach team.
