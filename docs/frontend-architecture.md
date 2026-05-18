# Frontend Architecture

SolBreach is still a single Next.js app, but the frontend is being split into focused modules so product areas can evolve independently without expanding `app/page.tsx`.

## Current module boundaries

- `app/page.tsx` owns wallet-derived state, Solana transaction handlers, level progress, and the main route-level view switch.
- `app/components/course-nav.tsx` owns the course dropdown navigation for Vulnerabilities, Case Studies, and locked Review Rooms.
- `app/components/case-studies-section.tsx` owns the case study list view and placeholder Start Level actions.
- `app/components/site-footer.tsx` owns the site footer and external links.

## Extraction rules

- Keep wallet connection, transaction sending, PDA derivation, and certification minting in the route shell until those flows have dedicated tests.
- Extract presentational sections first, then lift typed props into shared modules only when multiple sections need them.
- Avoid changing behavior while moving code. Each extraction should pass `npm run lint`, `npm run build`, and `cd anchor && cargo test --workspace`.

## Next split

The next low-risk extraction is the landing module: hero carousel, feature showcase, and CTA. After that, split `LevelWorkspacePage` and one level panel into a `levels/` component folder to establish the pattern for the remaining levels.
