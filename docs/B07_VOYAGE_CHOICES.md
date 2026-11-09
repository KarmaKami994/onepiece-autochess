# B07 — First crew, recruitment routes and harbor encounters

Current B09 extension: Usopp now offers two components plus one food; Franky
one component plus one food. Total offers, prices, timing and skip remain the
same. Existing saved component-only offers are retained exactly. The original
B07 implementation/evidence below describes its historical component-only
harness; see [B09 food](B09_FOOD_CONSUMABLES.md) for the current lifecycle.

## Locked local contract

Owner requested merge of all completed work, then B07. PRs #68 → #65 → #64
were squash-merged through their existing stack; main is
`93b1874ef760bf07d317771d8527d3240c0d339a`, tree-identical to B06 head
`9a0dfa412ed168dcb1eb9d209d442009cfd5426f` with green CI 168. No open PRs
remain at task start. B07 branch: `codex/b07-voyage-events`.

| Position | Decision | Timing / continuation |
| --- | --- | --- |
| Before R1 | First Crew: three distinct existing cost-1 recruits, normal 1-gold price | 23 s, then R1 preparation; no opening income/XP rerun |
| R10 / R20 | Existing cost-4 / cost-5 recruitment, now with a crew-origin route and open-sea wildcard | Existing 23 s; continue to R11/R21 as before |
| R16 / R21 | Usopp's Supply Stop: choose one of three distinct existing components as a gift | Harbor budget, then preparation of the same round |
| R18 / R23 | Franky's Workshop: two distinct existing components at 2 gold each, or sail on free | Harbor budget, then preparation of the same round |

The harbor budget is pinned PAC town timing: 16 s + 2 s per living player +
5 s encounter extension. Starter/recruitment use the 23-second Portal budget.
Explicit item decisions remain pausable; B06 settings/background/manual pauses,
clock checkpoints and timeout authority cover the new timed phases too.

### First crew and opening resources

The starter costs its normal cost (1); default starting gold is still 5, leaving
4 gold plus a cost-1 unit after selection. This replaces the first purchase,
not a free starting-resource buff. R1–3 enemies/rewards and initial shop rules
are unchanged. All eight players receive reserved offers and use the same price.
Bots use unchanged `scoreBotUnit` with stable ID ties. Skip is always legal;
unaffordable/exhausted offers can never block the voyage.

Keep the existing low-level `createMatch` constructor compatible for legacy
prepared-match consumers. Add an explicit `createVoyage` production entry point
that opens the starter phase; both the real client and production harness must
use it. The harness still normalizes all eight bot personalities before the
first phase transition/selection. Existing preparation fixtures are not silently
given a starter; dedicated tests exercise the real production entry point.

### Recruitment routes: actual expansion beyond P11

Two authored high-cost origin pools use existing units only:

- **Navy Headquarters:** Kizaru, Kuzan, Akainu, Garp; affinity `navy`.
- **Pirate Alliances:** Law, Ace, Hancock, Doflamingo, Capone Bege, Mihawk,
  Shanks, Blackbeard, Whitebeard; affinity to their existing pirate/revolutionary
  origin traits. This is a gameplay contact pool, not a claim of canon friendship.

Choose the route with most distinct owned crew definitions matching its origin
traits, stable route-ID tie break; never count duplicate copies as extra votes.
At the stage's primary cost band, seed at most two slots from the selected
route, preferring already represented effective traits. Fill the remaining slot
from the entire available primary band, including unselected route candidates:
an open-sea wildcard, not a forced individual character or guaranteed faction.
Only use R10→cost 3 / R20→cost 4 when the entire primary band cannot provide
three distinct definitions. Every offered copy is reserved once; selection
never decrements it again. Persist the route label alongside the exact offers.
Saved legacy P11 offers/reservations stay unchanged; do not regenerate them just
to apply the new route policy.

### Harbor catalog and bots

The two NPCs reuse Usopp/Franky portraits. No new unit/item/asset or combat
mechanic. The gift uses the current ten-component acquisition pool; the shop
offers two seeded distinct components, plus a free skip. No completed-item or
trait-grant shortcut, XP purchase, captain healing, unit exchange or food system.
New gifts/trades are separate sources; P10's existing rewards are untouched.

Generate all players' offers from serialized RNG before resolving choices. A
successful choice pays at most once and grants exactly one component; skip
costs/grants nothing. Reject invalid IDs, insufficient gold or repeated choices
without changing state/RNG. All players can always finish, including players
with no gold or no eligible content. Item inventory uses existing reward rules.

Bots choose free gifts using existing `scoreItemForPlayer`; stable item/offer-ID
ties. For paid offers require positive existing item score and preservation of
the personality's current economy reserve, otherwise skip. No changed weights,
new affinity coefficient, progression policy or catalyst/form guarantee.

## State, compatibility and observation

- Explicit `starter-choice` / `harbor-choice` phases; existing recruitment offer
  storage is reused for starter reservations, never `pendingItemChoices`.
- Persist harbor offers, route context and bounded once-per-choice receipts.
  These are factual receipts, not an event-sourcing/command framework.
- Enter harbor after ordinary round income/shop/XP once, then return directly
  to preparation in that round. Never replace its PvP battle or alter results,
  captain damage, streaks/history, or the fixed PvE/carousel/supply cadence.
- Schema 6 additive backfill; legacy preparation/battle saves never retroactively
  receive a starter or current-round harbor reward. Saved new choice phases
  resume the exact offers, prices, reservations and RNG without regeneration.
- Full-bench recruits merge when legal; otherwise return their reserved copy
  and convert to normal unit cost. A paid starter is charged before that fallback,
  so a failed receipt refunds its cost rather than creating extra gold.
- Codex, tutorial, Chronicle frame/validation/view and production diagnostics
  expose the new phases and actual choice sources. Existing raw reports remain
  immutable historical evidence; no new aggregate/baseline is requested.
- GameContent `1.32.0`, save schema `6`; authored recruitment/encounter content
  and timing metadata participate in the content hash; existing GameConfig is
  unchanged. Existing unit/item/
  trait/combat/economy values, shop odds/pool counts and bot scoring stay fixed.

## PAC research and port classification

Pinned `keldaanCommunity/pokemonAutoChess@a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee`:

- [`Shop.assignUniquePropositions`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/models/shop.ts#L383-L474):
  starter/common, unique and legendary stage bands; wanted synergy/region and
  distinct-family filtering. **Adapt:** current units, curated origin routes,
  shared-copy reservations, wildcard and scarcity fallback. No direct code copy.
- [`GameRoom.pickChoice`](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/game-room.ts#L1361-L1424):
  real acquired units/bench/evolution and first-partner fact. **Adapt:** local
  command/receive authority and resource-neutral 1-gold starter; do not copy
  Pokémon-specific evolution or special modes.
- [Town encounter catalog](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/town-encounters.ts)
  and [stage/town timing](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/config/game/stages.ts):
  **reference:** limited authored NPC offers and distinct gift-shop slots
  16/18/21/23; **direct numeric reuse:** 23 s and 16 + 2×alive + 5 s.
  Exact NPC prices/catalog are local adaptations, not purported PAC values.
- **Reject:** Matter/Colyseus room physics, Mongo/Firebase/Redux/community stack,
  extra modes, regions/Pokémon families as new local entities, random replacement
  PvE, generic encounter infrastructure, new food/weather/status systems.

## Verification

The owner explicitly approved the bounded verification scope before execution.

- PASS: typecheck/lint; 181 focused tests across 13 files; full unit suite once,
  69 files / 903 tests; build and asset/provenance validation.
- PASS: corrected starter/harbor/recruitment/pacing/full-voyage browser run
  22/22; unchanged tutorial and Chronicle cases 6/6 in the initial combined run,
  all at 1280×720 and 1920×1080. Screenshots inspected. Decorative rays now
  permit real skip clicks; no force-click, assertion or timeout relaxation.
  New tests now wait for asynchronous persistence and use the actual starting
  gold (5 → 4). R20 assertions explicitly include the new R21 harbor; old shop
  fixtures use the real starter skip to retain their empty-roster precondition.
  Windows teardown required stopping only the identified owned test server.
- PASS: legacy authored content, after removing the three new content fields
  and restoring its version label, retains hash `a6d7c074`; config `977295da`.
  Current content hash is `58e78178`. The intentional normalized P7 SHA-256 is
  `bcdbf36e2e35255b8a213b19d9cd47663bbfbca925211a4955b5ce52d7bd3b69`.
  One-seed diagnostic regression pins the complete new preparation trace;
  retained historical JSON reports are unchanged.
- NOT RUN: separate local production smoke/aggregate, 1,000-seed soak or new
  baseline. Single-match unit fixtures are regression tests, not measurements.
  Normal GitHub CI remains the publication/review gate. No B08/B09 work.

At eight living captains, new B07 timed budgets total at most 171 seconds:
23 seconds opening + four 37-second harbor stops, before early choices. Reports
expose these new budgets separately and add `harborGift`/`harborTrade` item
sources; old duration formulas/target booleans are not redefined. This is not a
new measured voyage duration or a balance baseline.
