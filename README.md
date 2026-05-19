# SolBreach

> Interactive Solana security labs for learning protocol exploitation through guided state visualization, account manipulation, and real vulnerability flows.

SolBreach is a protocol-driven security education platform for the Solana ecosystem.

Instead of forcing developers directly into local exploit environments, SolBreach teaches security concepts progressively through interactive protocol labs that visualize:
- account relationships,
- trust assumptions,
- protocol state transitions,
- exploit causality,
- and vulnerable execution flows.

The platform combines:
- real Solana programs,
- guided exploit cognition,
- visual protocol topology,
- constrained exploit manipulation,
- and wallet-bound progression systems

to create a modern security training experience purpose-built for the Solana Virtual Machine (SVM).

---

# Why SolBreach Exists

Most Solana security learning today happens through:
- scattered audit reports,
- isolated code snippets,
- postmortems,
- and highly advanced exploit writeups.

That creates a massive onboarding cliff.

New developers struggle to understand:
- PDA trust boundaries,
- account validation,
- token custody assumptions,
- signer authority,
- CPI execution risks,
- and state synchronization vulnerabilities.

SolBreach turns those abstract concepts into:

# interactive protocol behavior.

Players do not simply read exploits.
They observe, manipulate, and execute them progressively.

---

# Core Product Direction

SolBreach is NOT designed as:
- a browser IDE,
- a generic coding playground,
- or a traditional quiz-based CTF.

Instead, the platform focuses on:

# exploit cognition.

Every level teaches:
- how protocols trust accounts,
- how assumptions break,
- and how vulnerable relationships evolve during execution.

The experience is designed to feel closer to:
- protocol analysis,
- interactive security review,
- and exploit reasoning

than traditional gamified hacking platforms.

---

# Learning Model

Each level progressively transitions through multiple interaction stages.

## 1. Observe

Players first observe legitimate protocol behavior.

The platform visualizes:
- account relationships,
- protocol validation flow,
- internal ledger updates,
- and trusted execution paths.

This establishes the baseline mental model.

---

## 2. Manipulate

Players begin modifying protocol assumptions interactively.

Instead of writing exploit code immediately, they manipulate:
- vault relationships,
- mint sources,
- custody assumptions,
- and account mappings.

This allows players to discover:

# which trust boundaries actually matter.

---

## 3. Inspect

Only after understanding protocol causality do players inspect exploit structure.

At this stage, SolBreach exposes:
- constrained exploit anatomy,
- variable mapping,
- vulnerable account injection,
- and guided exploit execution.

The goal is to connect:
- protocol topology,
- account substitution,
- and exploit logic

without overwhelming users with full local environments too early.

---

# Current Curriculum

| Level | Name | Focus | Vulnerability |
|---|---|---|---|
| 0 | Hello SolBreach | PDA lifecycle warmup | Player registry initialization and closeout |
| 1 | The Illusionist | Account substitution | Counterfeit token account acceptance |
| 2 | Identity Thief | PDA authority misuse | Static seed authority overwrite |
| 3 | Trojan Horse | Arbitrary CPI | Delegated external program abuse |

---

# Current Architecture

SolBreach combines:
- interactive frontend visualization,
- backend exploit orchestration,
- and real Solana program execution.

The platform uses:
- real vulnerable programs,
- controlled counterfeit infrastructure,
- deterministic protocol state,
- and guided exploit surfaces

to preserve realism while maintaining approachable onboarding.

---

# Core Concepts

## Interactive Protocol Visualization

Every level includes a live topology graph that visualizes:
- wallets,
- vaults,
- token accounts,
- mints,
- treasury state,
- and trust relationships.

Protocol state evolves dynamically as the player progresses.

---

## Stateful Protocol Activity

The UI streams protocol execution progressively rather than exposing static checklists.

This allows players to experience:
- transaction flow,
- state evolution,
- validation logic,
- and exploit progression

as reactive protocol behavior.

---

## Guided Exploit Anatomy

Exploit execution is intentionally constrained.

Instead of exposing arbitrary exploit coding immediately, SolBreach focuses on:
- causal variables,
- account relationships,
- exploit structure,
- and trust remapping.

This keeps the learning experience focused on reasoning instead of boilerplate.

---

## Wallet-Bound Progression

Player progress is tied directly to Solana accounts and protocol state.

Levels use:
- PDAs,
- registry state,
- temporary protocol accounts,
- and on-chain verification

to validate exploit completion.

---

## Certification Flow

Completed levels unlock wallet-bound certifications using compressed NFTs (cNFTs).

These certifications act as:
- proof of completion,
- exploit verification,
- and future reviewer reputation primitives.

---

# Product Vision

SolBreach is evolving toward:

# interactive security infrastructure for Solana.

Long-term directions include:
- protocol review rooms,
- team training environments,
- exploit replay systems,
- audit onboarding labs,
- protocol-sponsored incident recreations,
- and reviewer certification flows.

The goal is to create:

# the modern security learning layer for the SVM ecosystem.

---

# Tech Stack

## Frontend
- Next.js
- React
- TailwindCSS
- Framer Motion

## Solana
- Rust
- Anchor Framework
- @solana/web3.js

## Certifications
- Metaplex Umi
- Bubblegum

## Backend Orchestration
- Session-driven exploit execution
- Deterministic protocol state management
- Guided exploit transaction builders

---

# Current Status

- Interactive Level 0 shipped
- Multi-stage Level 1 interaction flow implemented
- Real protocol topology visualization system live
- Guided exploit anatomy system implemented
- Devnet verification flow working
- Wallet-bound progression system working
- cNFT certification flow functional on devnet
- Modular frontend architecture stabilized
- Backend orchestration migration in progress

---

# Repositories

## Main Platform
https://github.com/jpromano-swe/solbreach

## Playground Repository
https://github.com/jpromano-swe/solbreach-playground

---

# Current Positioning

SolBreach is currently focused on:
- Solana developers,
- audit learners,
- security researchers,
- hackathon teams,
- and protocol engineering onboarding.

The platform is intentionally designed to reduce the onboarding gap between:
- beginner protocol understanding,
- and real exploit reasoning.

---

Built for Solana by ZirconDioxide and the SolBreach Team.
