# Level 2: Identity Thief

This level uses a static PDA seed for a supposedly user-specific profile.
Because the profile PDA does not include the owner key in the seed set, any
signer can overwrite the single global profile.

## Challenge source

Read:

- `anchor/programs/vault/src/instructions/level2.rs`
- `anchor/programs/vault/src/state.rs`

## Vulnerability

The contract derives the profile PDA from:

```text
[b"profile"]
```

instead of:

```text
[b"profile", user.key().as_ref()]
```

That means there is only one global profile account for everyone, and any
signer can update it.

## Objective

Overwrite the global `profile.commander` field with your wallet, then verify
the level.

## What the script does

- `setup`
  - initializes the global profile if missing
  - initializes your per-player Level 2 state
- `exploit`
  - calls the vulnerable update instruction
  - confirms the global commander now points at your wallet
- `verify`
  - confirms the hijack condition
  - marks the level complete
  - confirms the Level 2 PDA was closed
- `status`
  - shows the current profile commander and completion state

## How to use it

From the repo root:

```bash
node players/level2/level2.mjs setup
node players/level2/level2.mjs exploit
node players/level2/level2.mjs verify
node players/level2/level2.mjs status
```

## What to edit if you want to customize the attack

Start with `players/level2/level2.mjs`.

Like Level 1, it currently forwards to the official operator flow so you can
run the challenge immediately. Replace that forwarding if you want to craft
the transaction yourself.
