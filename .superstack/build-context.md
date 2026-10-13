# Build Context

## Debug

### Issues resolved

- Error: `Research Lab rl3-arbitrary-cpi cannot mint Level 3 certification.`
  - Cause: The certification API's Research Lab-to-level allowlist did not include RL3.
  - Fix: Map `rl3-arbitrary-cpi` to Level 3 before checking session completion.

### Last debug session

2026-07-31
