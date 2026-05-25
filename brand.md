# Brand - SolBreach

_Status: active_

SolBreach is a premium protocol security lab for learning Solana exploit causality through interactive state visualization. The product should feel like infrastructure-grade developer security tooling, not a crypto dashboard, terminal emulator, or gamified hacker toy.

## Product Feel

- Calm, technical, focused, and serious.
- Minimal surface with deeper interaction underneath.
- Premium protocol lab, modern observability tooling, and interactive blockchain state visualization.
- Educational through synchronized interaction, not through tutorial density.

## Visual Direction

Reference direction:

- Stripe
- Linear
- Vercel
- modern observability tooling
- developer infrastructure products

Avoid:

- crypto casino UI
- cyberpunk overload
- Matrix/terminal aesthetics
- fake hacker visuals
- dashboard density
- giant glows, noisy grids, and excessive neon

## Core Palette

Use existing design tokens first. When explicit brand colors are needed:

- SolBreach purple: `#9945ff`
- Solana green: `#14f195`
- Success green: emerald accents, subdued backgrounds
- Warning/corruption: restrained amber and amber-red, not aggressive red
- Base: dark neutral surfaces from app tokens

Button rule:

- Certification CTAs use solid SolBreach purple `#9945ff`.
- Certification focus rings use Solana green `#14f195`.
- Primary execution CTAs may use foreground/neutral styling until unlocked.
- Do not introduce unrelated saturated category colors.

## Typography

- Large level titles should be bold, clean, and tightly tracked.
- Section labels use small uppercase letter-spaced text.
- Body copy is concise, direct, and calm.
- Code uses mono styling but should not feel like a terminal.

Copy should avoid hype. Prefer protocol language:

- "Protocol activity"
- "Exploit causality"
- "Static PDA derived"
- "Commander value overwritten"
- "Verification unlocked"
- "Certification unlocked"

## Layout Grammar

Levels should use a consistent interaction grammar:

- Left column: understanding, controls, exploit anatomy, or reasoning prompts.
- Center column: interactive protocol topology or code/protocol mapping.
- Right column: protocol activity and live system feedback.

For Level 0:

- Keep the two-column onboarding feel.
- Protocol Activity is the action focus.
- Code snippet remains visible for credibility.

For Levels 1 and 2:

- Use stages: Observe, Manipulate, Inspect.
- Observe is a local simulation.
- Manipulate is controlled assumption testing.
- Inspect is exploit causality and backend execution.

## Protocol Activity

Protocol Activity is not a checklist.

Rules:

- Reveal events progressively.
- Do not show future steps before they happen.
- Avoid "Pending..." and "Awaiting..." language.
- Use completed/current protocol states.
- Activity copy should explain why state changed.

Examples:

- "Wallet signature received"
- "Static commander PDA derived"
- "Commander target remapped"
- "Profile overwrite accepted"
- "Connected wallet has now program authority"
- "Internal ledger credit inflated"

## Topology And Motion

The topology graph is the educational medium.

Rules:

- Use React Flow / XYFlow for account topology.
- Use ELK layout for deterministic graph placement.
- Animate active paths subtly.
- Highlight nodes when their related protocol state changes.
- Keep motion restrained and infrastructure-grade.
- Use message overlays for explanatory cues; do not turn every explanation into a graph node.

Successful/corrupted paths:

- Legitimate path: subdued emerald.
- Exploit path: restrained amber-yellow.
- Counterfeit/corrupted nodes: amber-red, structurally valid but suspicious.

## Code Panels

Code panels signal real protocol logic.

Rules:

- Keep code visible when it supports credibility.
- Use subtle borders, low-contrast panel backgrounds, and elegant highlighting.
- No fake terminal styling.
- No IDE chrome unless the interaction genuinely requires it.
- Highlight code lines when protocol activity maps to code behavior.

## Certification

Certification minting should feel earned.

Rules:

- Do not show certification CTA before successful exploit/verification.
- After completion, show a compact "Certification unlocked" card.
- CTA label should be "Unlock Certification" unless already minted.
- Use the solid purple brand button used in Levels 1 and 2.

## Interaction Tone

The user should feel:

- "I understand why this exploit works."
- "I am interacting with a real protocol system."
- "I can map state transitions to account relationships."

The user should not feel:

- "I completed a coding exercise."
- "I clicked through a tutorial."
- "I am using a fake hacker dashboard."
