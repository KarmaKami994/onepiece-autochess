# Release verification

## Routine change

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run assets:validate
npm run test:production-smoke
npm run build
npm run test:e2e
git diff --check
```

The production smoke runs 50 unchanged-production matches and is appropriate
for CI and normal hardening. Browser tests assert no console errors, missing
local assets, failed requests, or required external gameplay traffic.

## Deliberate release/balance audit

Run `npm run test:production-soak` once when preparing a dated balance release,
or start the manual GitHub Actions `Release Production Soak` workflow. It
simulates 1,000 production seeds. Both production reports include the git SHA,
seed count/range, save schema, content/config hashes, Node version, and
generation timestamp. Review crashes, completion, match duration, timeout/draw
rates, character presence, trait reachability, and item usage before committing
a dated report.

Run `npm audit --audit-level=high` and review each finding. Do not apply forced
or breaking upgrades without verifying the build and browser flow.

## Assets

`npm run assets:validate` checks committed manifests, referenced files,
dimensions, hashes, and provenance without regenerating expensive artwork.
Runtime gameplay must work with committed assets and zero generation tools.
