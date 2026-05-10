# Level 0: Wallet Warmup

Level 0 is not a real exploit. It is the bootstrap step that creates your
player registry and your temporary level PDA, then verifies and closes it.

## Challenge source

Read:

- `anchor/programs/vault/src/instructions/level0.rs`
- `anchor/programs/vault/src/state.rs`

## Objective

Mark `completed_levels[0] = true` for your wallet.

## What the script does

- `setup`
  - creates `UserStats` if missing
  - creates `Level0State` if missing
- `verify`
  - calls `verify_and_close_level_0`
  - confirms the level is marked complete
  - confirms the temporary PDA was closed
- `status`
  - reads the on-chain state without mutating anything

## How to use it

From the repo root:

```bash
node players/level0/level0.mjs setup
node players/level0/level0.mjs verify
node players/level0/level0.mjs status
```

Optional flags:

```bash
node players/level0/level0.mjs status --rpc https://api.devnet.solana.com --keypair ~/.config/solana/id.json
```

## When to edit this file

Usually never. This level is meant to bootstrap the wallet so the exploit
levels can run afterward.
