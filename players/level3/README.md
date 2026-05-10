# Level 3: The Trojan Horse

This level is the first one that really benefits from a second on-chain
program. The vulnerable contract blindly delegates work to an arbitrary
external program and forwards a PDA signer into that CPI.

Your attacker program abuses that gifted signer to drain the guild bounty.

## Challenge source

Read:

- `anchor/programs/vault/src/instructions/level3.rs`
- `anchor/programs/vault/src/state.rs`

## Vulnerability

The contract does not verify which external program it is delegating into.

That means you can:

1. deploy your own malicious program
2. pass that program into the unchecked CPI slot
3. receive the guild PDA signer inside your malicious program
4. use that signer to drain the guild bounty vault through the SPL Token program

## Objective

Drain the guild bounty into your own token account, then verify the level.

## What the script does

- `setup`
  - creates or reuses the guild authority PDA
  - creates your per-player Level 3 state
  - creates a real reward mint, a guild bounty vault, and your reward account
- `exploit`
  - calls `delegate_task`
  - forwards the sample `follow_orders` payload expected by the sample
    `mercenary` program
  - requires `--external-program <pubkey>`
- `verify`
  - confirms your reward account received the bounty
  - marks the level complete
  - confirms the Level 3 PDA was closed
- `status`
  - shows the guild config and your reward token balance

## How to use it

From the repo root:

```bash
node players/level3/level3.mjs setup
node players/level3/level3.mjs exploit --external-program <program-id>
node players/level3/level3.mjs verify
node players/level3/level3.mjs status
```

## Sample attacker program

The repo now includes a sample malicious helper program:

- `anchor/programs/mercenary`

That program is intentionally not part of the main game UI. It exists as a
reference attacker contract for this level shape.

If you want to use it on localnet:

```bash
cd anchor
NO_DNA=1 anchor build
NO_DNA=1 anchor deploy
```

Then use the deployed mercenary program id with:

```bash
node players/level3/level3.mjs exploit --external-program <program-id>
```

If you want to make the exploit your own, replace the sample program or fork
its behavior.
