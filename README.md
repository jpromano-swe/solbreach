<p align="center">
  <img src="https://raw.githubusercontent.com/jpromano-swe/solbreach/research-labs-frontend/public/logo_crop.png" alt="SolBreach" width="420" />
</p>

**Security Training Layer for Solana builders.**

Practice finding real security issues, prove they matter,
and learn how to fix vulnerable Solana programs before shipping to production.

[Website](https://solbreach.com) | [Beta](https://beta.solbreach.com) | [Documentation](https://solbreach.gitbook.io/documentation) | [Backend](https://github.com/jpromano-swe/solbreach-backend)

> SolBreach is currently in beta and runs on Solana devnet. Do not use production funds.

## How it works

1. Connect a Solana wallet on devnet.
2. Inspect a vulnerable protocol and its account relationships.
3. Manipulate state and reproduce the vulnerability.
4. Verify the exploit's impact and document the finding.
5. Earn wallet-bound progress, badges, and certificates.

## Current beta

- Guided modules covering account substitution, PDA authority misuse, and arbitrary CPI.
- Two fully playable Research Labs, with a third lab in testing.
- On-chain vulnerability and progression state using PDAs.
- Backend-verified submissions, progress tracking, and badges.
- Compressed NFT certificates deployed on devnet.
- Beta authentication and onboarding flow.

Breach Rooms for cohort training and technical assessment are under active development.

## Repository map

| Repository | Purpose |
| --- | --- |
| **This repository** | Next.js application, guided lab interfaces, Anchor programs, and certificate tooling |
| [solbreach-backend](https://github.com/jpromano-swe/solbreach-backend) | FastAPI API for authentication, beta access, labs, submissions, progress, badges, analytics, and certifications |
| [Documentation](https://solbreach.gitbook.io/documentation) | Product model, learning paths, and public technical documentation |

## Architecture

```text
Next.js learning interface
        |
        +-- FastAPI backend -> PostgreSQL
        |
        +-- Solana devnet -> Anchor challenge programs and PDAs
        |
        +-- Metaplex Bubblegum -> compressed NFT certificates
```

The vulnerable programs execute on Solana devnet. The backend manages access, sessions, deterministic verification, progression, and credentials; it does not execute uploaded user code.

## Run locally

Requirements: Node.js 20+, npm, and a Solana devnet wallet. Rust, Solana CLI, and Anchor are only required when building or testing the on-chain programs.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For the complete local flow, configure `NEXT_PUBLIC_API_BASE_URL` and run the [backend](https://github.com/jpromano-swe/solbreach-backend) by following its README.

Useful checks:

```bash
npm run build
npm run lint
npm run anchor-build
npm run anchor-test
```

## Stack

- Next.js, React, TypeScript, and Tailwind CSS
- Rust and Anchor
- FastAPI, PostgreSQL, and SQLAlchemy
- Solana Kit and `@solana/web3.js`
- Metaplex Umi and Bubblegum

Built for the Solana ecosystem by [Juan Pablo Romano](https://github.com/jpromano-swe).
