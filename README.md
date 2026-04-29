# SolBreach ⚡️

## Gamified Web3 security training natively designed for the Solana Virtual Machine (SVM). Learn to exploit, learn to secure.

Note: This repository houses the core architectural blueprint and smart contract designs for SolBreach. Active code scaffolding is commencing as part of the Dev3pack Hackathon and the Superteam Agentic Engineering Grant.

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

##  MVP Curriculum (Dev3pack Build)

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

Connect wallet to the SolBreach web dashboard.

Initialize a level instance (Creates your unique vulnerable PDA).

Clone the local "Hacker Playground" repository.

Write the exploit in Rust/TypeScript using Anchor.

Execute the exploit against the Mainnet/Devnet program.

Verify the hack on the dashboard to trigger the Agentic Auditor and claim your cNFT Flag.

## ⚙️ Tech Stack

Smart Contracts: Rust, Anchor Framework

Frontend: Next.js, React, Tailwind CSS

Web3 Integration: @solana/web3.js, Wallet Adapter

Gamification: Metaplex Umi / Bubblegum SDK

Automation: SendAI / Claude Max (Agentic Engineering)

## 🚀 Roadmap

[x] Phase 1: Architecture Blueprint & Smart Contract Design

[x] Phase 2: UI/UX Wireframing & Pitch Deck

[ ] Phase 3: Dev3pack Hackathon (Scaffold Next.js & Anchor Registry)

[ ] Phase 4: Metaplex cNFT Integration & Localnet Testing

[ ] Phase 5: Mainnet Deployment & Community Launch

Built with ❤️ for the Solana Ecosystem.
