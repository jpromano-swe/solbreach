# SolBreach ⚡️

## Gamified Web3 security training natively designed for the Solana Virtual Machine (SVM). Learn to exploit, learn to secure.

This repository now contains the live SolBreach web app, the Anchor challenge programs, the cNFT certification flow, and the internal tooling used to run and verify levels on devnet.

## The Problem

As the Solana ecosystem scales, the complexity of its protocols has skyrocketed. However, developer security education has failed to keep pace. The SVM utilizes a fundamentally different architecture than the EVM, rendering Ethereum-based security training (like Ethernaut) obsolete.

Currently, developers lack a persistent, interactive environment to practice offensive security natively on Solana. This results in the continuous deployment of smart contracts with critical, preventable logic flaws—such as Anchor constraint omissions, unchecked Cross-Program Invocations (CPIs), and Program Derived Address (PDA) authority bypasses.

## The Solution: SolBreach

SolBreach is an open-source, interactive Capture The Flag (CTF) environment where developers learn to secure smart contracts by actively exploiting them. We transform dry security documentation into an immersive, hands-on hacker workflow.

Core Architectural Innovations

To achieve a seamless UX without the prohibitive costs of deploying individual smart contracts for every user, SolBreach utilizes a highly optimized, Solana-native architecture:

Zero-Cost Execution (Rent-Refund PDAs): Instead of deploying a new program per user, SolBreach operates via a single monolithic Anchor registry. Players lock a micro-fraction of SOL to initialize a PDA for their specific level instance. Upon successfully "hacking" the level, the final instruction closes the PDA, instantly refunding the rent and creating a zero-cost Mainnet experience.

Proof-of-Hack (Metaplex cNFTs): Progress is tracked immutably on-chain. When a developer completes a level, our serverless API issues a Metaplex Compressed NFT (cNFT) "Flag" via Bubblegum, costing fractions of a cent while providing a verifiable credential for auditing firms.

Agentic Auditor (AI Integration): We integrate an autonomous agent into the core game loop. When a developer submits an exploit, the agent autonomously parses the transaction simulation, verifies if the on-chain state (PDA) was successfully manipulated according to the level's win-condition, and triggers the cNFT reward.

## MVP Curriculum (Dev3pack Build)

The initial hackathon build focuses on 3 foundational Anchor anti-patterns:

Level

Concept

The Vulnerability

### 1. The Illusionist

Account Substitution

Missing #[account(constraint = ...)] allowing users to pass counterfeit SPL tokens.

### 2. Identity Thief

PDA Authority Bypass

Static seeds allowing any signer to overwrite the global state PDA.

### 3. Trojan Horse

Arbitrary CPI

Invoking unchecked external programs via malicious user input data.

#### 💻 The Hacker Workflow

Players do not just click buttons on a web UI; they use real developer tools.

Connect wallet to the SolBreach web app.

Open the level page and inspect the lore, hints, and vulnerable snippet.

Clone the external SolBreach Playground repository.

Run the exploit locally from the playground against the devnet program.

Return to the web app to verify progress and mint the cNFT certification.

## ⚙️ Tech Stack

Smart Contracts: Rust, Anchor Framework

Frontend: Next.js, React, Tailwind CSS

Web3 Integration: @solana/web3.js, Wallet Adapter

Gamification: Metaplex Umi / Bubblegum SDK


## 🚀 Current Status

[x] Anchor challenge program live on devnet

[x] Levels 0–3 implemented and tested

[x] Web board, level pages, and profile gallery shipped

[x] Metaplex Bubblegum cNFT certifications working on devnet

[x] External playground repo ready for player exploit flow

## Repositories

- Web app + contracts: `https://github.com/jpromano-swe/solbreach`
- Player playground: `https://github.com/jpronano-swe/solbreach-playground`

Built for Solana by Rustopia.
