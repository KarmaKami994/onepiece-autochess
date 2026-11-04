# Product requirements

## Current product

Grand Line Auto Chess is a desktop-browser, local/offline auto-battler for one
human captain and seven deterministic bots. A complete voyage includes shop and
economy decisions, deployment, PvE and PvP combat, component crafting and the
complete 55-recipe item system, the Bounty Regatta, local save/continue,
scouting/spectating, tutorial guidance, accessibility settings, and final
placement results. P11 Recruitment at rounds 10/20 and P12 named PvE bosses are
complete. GameContent is `1.31.0`; save schema is `6`.

The game must:

- run on localhost without an account, server, database, or gameplay network;
- remain playable at 1280×720 and 1920×1080;
- derive gameplay only from explicit state, commands, content, seeds, and ticks;
- preserve canonical IndexedDB checkpoints and immutable battle results, with
  deterministic replay only for legacy save compatibility;
- show the complete last battle lineup separately from the end-of-voyage bench,
  with an unclassified fallback for old saves lacking deployment information;
- bundle every required runtime image and sound locally.

## Future direction

A later phase may add small private online matches for friends. That product
would use invite access, reconnect support, persistent matches, and a single
authoritative server. The current refactor only keeps the domain portable; it
does not implement multiplayer, authentication, lobbies, WebSockets, or a
remote database.

## Deliberate non-goals

Ranked play, public matchmaking, chat, trading, mobile layout,
microservices, and public hosting remain outside the current scope.

## Current handoff

P4/P11/P12 are implemented. PR #58 merged the behavior-neutral bot progression
diagnostic at `918d16b88e182ac9c81d05c73deb651824d51df8`; the first P1B tuning
candidate remains rejected. B01 completes result presentation and current
documentation. Further batches need their own bounded task; no bot tuning or
new gameplay is implied. Smoker remains frozen/watch.
