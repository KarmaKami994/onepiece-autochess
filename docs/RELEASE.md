# Release verification

## Routine change

GitHub CI selects checks from the files changed against the base. The `changes`
job prints the selection. Changes in multiple areas combine their checks without
running the same suite twice.

| Change | What CI runs |
| --- | --- |
| Repository Markdown and license | Change detection only. |
| One existing or new unit test or browser spec | The changed test file plus applicable build and static checks. |
| Mapped feature areas, such as the lobby, HUD, clock or Chronicle | The feature's unit and browser tests. Style-only changes use the browser checks. |
| Assets | Asset validation, asset tests, build and representative browser specs. |
| Game core, dependencies, or uncertain comparison | Full unit coverage once and full browser checks. Game-affecting changes and uncertain comparisons also run the 50-match production smoke. |
| Dependency manifests | GitHub Dependency Review on the pull request. |

Use local checks relevant to the change. For example, run
`npm test -- tests/phase-clock.test.ts` for the clock unit test or
`npm run test:e2e -- e2e/pac-hud.spec.ts` for the HUD browser checks.
The manual `CI` workflow runs the full integration checks. Browser specs
continue to cover both configured desktop sizes.

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
