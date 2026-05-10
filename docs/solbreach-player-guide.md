# SolBreach Player Guide

> Learn the exploit. Run the transaction. Prove it on-chain.

## Overview

SolBreach is a Solana-native smart contract wargame.

Players do **not** solve levels by editing the vulnerable program itself.  
They solve levels by:

1. Reading the vulnerable contract logic
2. Running a player script or operator flow locally
3. Sending exploit transactions to `devnet` or `localnet`
4. Verifying the win condition on-chain

The product is split into three surfaces:

- **Challenge source**: the vulnerable Anchor program
- **Player workspace**: runnable `.mjs` scripts for each level
- **Web board**: a UI for state inspection, guided actions, and verification

---

## Repository Map

### Challenge source

Read the vulnerable logic here:

- `anchor/programs/vault/src/instructions/level0.rs`
- `anchor/programs/vault/src/instructions/level1.rs`
- `anchor/programs/vault/src/instructions/level2.rs`
- `anchor/programs/vault/src/instructions/level3.rs`
- `anchor/programs/vault/src/state.rs`

### Player workspace

This is where the player should start:

- `players/README.md`
- `players/level0/level0.mjs`
- `players/level1/level1.mjs`
- `players/level2/level2.mjs`
- `players/level3/level3.mjs`

### Operator CLI

The internal helper CLI lives here:

- `scripts/solbreach-operator.mjs`

### UI board

The browser control surface lives here:

- `app/page.tsx`

---

## How SolBreach Works

### The contract model

SolBreach uses a single `vault` program and tracks player progress in per-wallet PDAs.

The core pattern is:

1. Create `UserStats`
2. Create a level-specific PDA
3. Exploit the vulnerable instruction path
4. Call the verifier
5. Mark the level complete
6. Close the temporary level PDA

This keeps progression on-chain and keeps per-level execution cheap.

### The exploit model

Most levels are solved with a **scripted client transaction**, not by modifying the vulnerable contract.

That means the player usually needs:

- a local keypair
- an RPC target
- a player script
- the ability to submit transactions

Only Level 3 requires an **attacker program** in addition to a client script.

---

## What You Need Locally

### Required

1. Node.js and npm
2. Solana CLI
3. A local keypair JSON file
4. This repository
5. Dependencies installed from the repo root

### Install dependencies

From the project root:

```bash
npm install
```

### Create a player keypair

```bash
mkdir -p .keys
solana-keygen new -o .keys/player.json
```

### Point Solana CLI at devnet

```bash
solana config set --keypair .keys/player.json --url devnet
```

### Fund the player wallet

```bash
solana airdrop 2
```

### Check the active wallet

```bash
solana address
solana balance
```

> Tip  
> If you want the browser UI and the terminal to act as the **same wallet**, import the same keypair into your browser wallet.

---

## UI vs Scripts vs CLI

### Use the UI when you want to

- inspect level state
- see PDA addresses
- trigger guided actions
- verify that on-chain completion happened
- monitor progress visually

### Use the player scripts when you want to

- solve the level as a player
- run the exploit from your terminal
- keep your work inside the player workspace

### Use the operator CLI when you want to

- bootstrap setup quickly
- inspect manifests under `.solbreach/operator/`
- run low-level flows directly
- debug setup and verification

---

## Recommended Workflow

For every level, use this order:

1. Read the vulnerable program source
2. Read the level README in `players/levelX/`
3. Run the setup step
4. Run the exploit step
5. Run the verify step
6. Inspect the result in the UI

---

## Level Progression

## Level 0 — Wallet Handshake

### Purpose

Level 0 is the warmup.

It proves that:

- `UserStats` can be created
- the per-level PDA pattern works
- the verifier updates completion correctly
- the temporary level PDA closes correctly

### Goal

Complete the PDA lifecycle:

1. initialize stats
2. initialize level
3. verify and close

### Commands

```bash
node players/level0/level0.mjs setup
node players/level0/level0.mjs verify
node players/level0/level0.mjs status
```

### Win condition

The level is complete when:

- `completed_levels[0] == true`
- the Level 0 PDA is closed

---

## Level 1 — The Illusionist

### Vulnerability

**Account substitution**

The program accepts valid SPL token accounts but fails to constrain the mint correctly.

That means the player can:

- create a fake mint
- create a fake vault token account
- create a fake user token account
- deposit worthless tokens
- still receive internal credit

### Goal

Credit the internal ledger with `1_000_000` token units without depositing the expected real asset.

### Commands

```bash
node players/level1/level1.mjs setup
node players/level1/level1.mjs exploit
node players/level1/level1.mjs verify
node players/level1/level1.mjs status
```

### What setup does

Setup prepares:

- the bank PDA
- the expected mint
- the fake mint
- the fake vault token account
- the fake user token account
- the player’s Level 1 PDA

### Win condition

The level is complete when:

- `deposited_amount >= 1000000`
- `completed_levels[1] == true`
- the Level 1 PDA is closed

---

## Level 2 — Identity Thief

### Vulnerability

**Static PDA profile hijack**

The profile PDA uses static seeds, so there is only one global registry.

That means any signer can overwrite it.

### Goal

Replace the global `commander` field with your own wallet address.

### Commands

```bash
node players/level2/level2.mjs setup
node players/level2/level2.mjs exploit
node players/level2/level2.mjs verify
node players/level2/level2.mjs status
```

### What setup does

Setup prepares:

- the global profile PDA
- an initial non-player commander
- the player’s Level 2 PDA

### Win condition

The level is complete when:

- `profile.commander == player_wallet`
- `completed_levels[2] == true`
- the Level 2 PDA is closed

> Note  
> The global profile account remains on-chain. Only the per-player Level 2 PDA closes.

---

## Level 3 — Trojan Horse

### Vulnerability

**Arbitrary CPI**

The program delegates execution into an unchecked external program and forwards signer privileges it should not trust.

This level is different from Levels 1 and 2:

- it cannot be solved with a client transaction alone
- it requires an attacker-controlled on-chain program

### Goal

Drain the guild’s bounty vault by supplying a malicious external program that abuses the forwarded guild authority signer.

### Commands

```bash
node players/level3/level3.mjs setup
node players/level3/level3.mjs exploit --external-program <program-id>
node players/level3/level3.mjs verify
node players/level3/level3.mjs status
```

### What setup does

Setup prepares:

- the shared guild authority PDA
- a reward mint
- a bounty vault
- the player reward token account
- the player’s Level 3 PDA

### Attacker program

Use either:

- the sample `mercenary` program in this repository
- or your own attacker program

The sample attacker program lives here:

- `anchor/programs/mercenary/src/lib.rs`

### Win condition

The level is complete when:

- the player reward account receives the bounty amount
- `completed_levels[3] == true`
- the Level 3 PDA is closed

---

## Standard Devnet Flow

If you want to play against the live devnet deployment:

### 1. Install dependencies

```bash
npm install
```

### 2. Create or choose a player keypair

```bash
mkdir -p .keys
solana-keygen new -o .keys/player.json
```

### 3. Point Solana CLI at devnet

```bash
solana config set --keypair .keys/player.json --url devnet
```

### 4. Fund the wallet

```bash
solana airdrop 2
```

### 5. Clear Level 0

```bash
node players/level0/level0.mjs setup
node players/level0/level0.mjs verify
```

### 6. Continue through the exploit levels

```bash
node players/level1/level1.mjs setup
node players/level1/level1.mjs exploit
node players/level1/level1.mjs verify

node players/level2/level2.mjs setup
node players/level2/level2.mjs exploit
node players/level2/level2.mjs verify

node players/level3/level3.mjs setup
node players/level3/level3.mjs exploit --external-program <program-id>
node players/level3/level3.mjs verify
```

---

## Localnet Flow

If you want to test everything against a local validator:

### 1. Start the validator

```bash
solana-test-validator --reset
```

### 2. Point the CLI to localhost

```bash
solana config set --keypair .keys/player.json --url localhost
```

### 3. Fund the wallet

```bash
solana airdrop 100
```

### 4. Build and deploy the Anchor programs

From `anchor/`:

```bash
NO_DNA=1 anchor build
NO_DNA=1 anchor deploy
```

### 5. Run the player scripts

Use the same `players/levelX/levelX.mjs` flow as devnet.

---

## UI Board Flow

The UI is a **board**, not the main exploit environment.

Use the browser when you want to:

- inspect current wallet state
- see derived PDA addresses
- confirm which stage is active
- manually submit guided instructions
- verify completion visually

### Browser startup

From the project root:

```bash
npm run dev
```

Then open:

- `http://localhost:3000`

### Important

The browser wallet and the terminal wallet are separate unless you intentionally use the same keypair in both places.

If you want the same identity across UI and scripts:

- import the same keypair into the browser wallet
- keep the cluster consistent

---

## Current Architecture

### `vault`

The vulnerable game program.

Responsibilities:

- level state
- verifiers
- completion tracking
- PDA lifecycle

### `mercenary`

The sample attacker program for Level 3.

Responsibilities:

- receive the delegated CPI
- use forwarded signer privileges
- drain the bounty vault into the player reward account

---

## Troubleshooting

## `UserStats PDA is missing`

You have not cleared Level 0 yet for the wallet currently used by the script.

Fix:

```bash
node players/level0/level0.mjs setup
node players/level0/level0.mjs verify
```

## `Attempt to load a program that does not exist`

The target program is not deployed on the selected cluster.

Check:

- cluster selection
- program deployment
- wallet network

## `InstructionFallbackNotFound`

Your client is calling a newer instruction than the deployed program supports.

Fix:

- rebuild
- redeploy the latest program

## `Provided owner is not allowed`

You are trying to create or use a token account with an invalid owner relationship.

This commonly appears during Level 1 or Level 3 setup when account provisioning is wrong.

## `DeclaredProgramIdMismatch`

Your local attacker program binary and its declared program id do not match.

Fix:

- regenerate the program keypair
- update `declare_id!`
- rebuild
- redeploy

---

## Recommended Reading Order

For new players:

1. Read this page
2. Read `players/README.md`
3. Read `players/level0/README.md`
4. Read the vulnerable contract source for the target level
5. Run the setup script
6. Run the exploit script
7. Run the verify script

---

## Summary

SolBreach is designed so the player learns the real exploit workflow:

- inspect source
- prepare accounts
- craft the transaction
- exploit the bug
- verify on-chain state

The browser is the board.  
The script is the attack surface.  
The chain is the source of truth.

