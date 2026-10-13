# SolBreach on-chain challenges

This workspace contains the `vault` challenge/certificate program and the `mercenary`
CPI helper. Current devnet addresses and Explorer links are in the [root README](../README.md).
It is not a personal SOL vault template.

| Level                  | Learning objective                            | Verification                                      |
| ---------------------- | --------------------------------------------- | ------------------------------------------------- |
| 0 — Hello SolBreach    | Wallet, player PDA and transaction lifecycle  | Warmup state belongs to the player                |
| 1 — The Illusionist    | Missing mint/account relationship validation  | Deposit goal reached                              |
| 2 — The Identity Thief | Shared PDA and missing authority checks       | Player controls the profile commander             |
| 3 — The Trojan Horse   | Arbitrary CPI and forwarded signer privileges | Delegated signer abuse meets the bounty objective |

`verify_and_close_level_X` records progression and closes the level account. A
certificate claim requires the corresponding completed level in `UserStats`.

## Administrative boundaries

`init_bank`, `init_guild_authority` and `init_certification_authority` require the
upgrade authority from the canonical loader-owned ProgramData PDA. Passing another
program's metadata does not satisfy the PDA constraint. These controls protect
infrastructure and are not intended training vulnerabilities. Immutable programs
must initialize their global configuration before removing the upgrade authority.

The intentional shared global profile in Level 2 and the malicious CPI helper stay
available for training. Use only devnet/test assets.

## Build and regression tests

```bash
anchor build
cargo test -p vault
```

Build first: LiteSVM tests embed the freshly compiled `target/deploy/vault.so` and
`mercenary.so`. The suite covers level completion and rejection of unauthorized
global initialization. From the frontend root, regenerate clients with `npm run codama:js`
after an IDL change. Global init instructions now require the ProgramData account.

A code commit does not upgrade devnet. Deploy the new program, regenerate/use the
matching client, and then verify the demo transaction before claiming the patch is live.
