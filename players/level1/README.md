# Level 1: The Illusionist

The bank accepts any valid SPL TokenAccount as the vault destination, but it
does not constrain the mint. That means you can deposit counterfeit tokens and
still get credited internally.

## Challenge source

Read:

- `anchor/programs/vault/src/instructions/level1.rs`
- `anchor/programs/vault/src/state.rs`

## Vulnerability

The contract checks that `vault` is a `TokenAccount`, but it does not enforce
that the token account belongs to the expected mint.

That means an attacker can:

1. create a fake mint
2. mint themselves worthless tokens
3. pass a fake vault token account for that same fake mint
4. call the vulnerable deposit instruction
5. get the internal balance credited as if the deposit were legitimate

## Objective

Push the on-chain deposited amount to `1000000`, then verify the level.

## What the script does

- `setup`
  - creates or reuses the bank PDA
  - creates your per-player Level 1 state
  - creates a fake mint, fake vault, and fake user token account
  - mints `1000000` fake tokens to your fake user account
- `exploit`
  - calls the vulnerable deposit path with the fake token accounts
- `verify`
  - confirms the deposit goal is reached
  - marks the level complete
  - confirms the Level 1 PDA was closed
- `status`
  - shows whether the exploit condition is already satisfied

## How to use it

From the repo root:

```bash
node players/level1/level1.mjs setup
node players/level1/level1.mjs exploit
node players/level1/level1.mjs verify
node players/level1/level1.mjs status
```

## What to edit if you want to customize the attack

Start with `players/level1/level1.mjs`.

Right now it forwards to the official operator flow so you can play
immediately. If you want to make the exploit your own, replace that forwarding
with your own transaction-building logic.
