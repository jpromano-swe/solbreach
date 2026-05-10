# SolBreach Player Workspace

This folder is the player-facing workspace.

Use it when you want to solve levels locally without digging through the
frontend or the Anchor authoring files.

## What belongs here

- Read the challenge source in `anchor/programs/vault/src/instructions/`
- Run the exploit from `players/levelX/levelX.mjs`
- Modify the level script if you want to craft your own attack flow
- Use the web UI only as a monitor or guided control surface

## What you need locally

1. A Solana keypair JSON file
2. RPC access to `devnet` or `localnet`
3. Project dependencies installed from the repo root:

```bash
npm install
```

4. Level source already deployed on the target cluster

## Recommended workflow

1. Read the vulnerable level source
2. Run the level script from this folder
3. Inspect the on-chain result with `status`
4. Verify the level once the exploit condition is satisfied

## Levels

- `players/level0`
  - Warmup / player registry bootstrap
- `players/level1`
  - The Illusionist / counterfeit token deposit
- `players/level2`
  - Identity Thief / static PDA profile hijack
- `players/level3`
  - Trojan Horse / arbitrary CPI with a malicious helper program

## Quick start

From the repo root:

```bash
node players/level0/level0.mjs setup
node players/level0/level0.mjs verify

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

## Notes

- These scripts are intentionally simple entrypoints.
- They currently delegate to the official SolBreach operator CLI.
- If you want to build your own exploit flow, start by editing the level
  script inside its folder instead of touching the challenge program.
