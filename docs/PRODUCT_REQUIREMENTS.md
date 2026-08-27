# Product requirements

## Current product

Grand Line Auto Chess is a desktop-browser, local/offline auto-battler for one
human captain and seven deterministic bots. A complete voyage includes shop and
economy decisions, deployment, PvE and PvP combat, the Bounty Regatta, local
save/continue, scouting, tutorial guidance, accessibility settings, and final
placement results.

The game must:

- run on localhost without an account, server, database, or gameplay network;
- remain playable at 1280×720 and 1920×1080;
- derive gameplay only from explicit state, commands, content, seeds, and ticks;
- preserve versioned IndexedDB saves and deterministic battle regeneration;
- bundle every required runtime image and sound locally.

## Future direction

A later phase may add small private online matches for friends. That product
would use invite access, reconnect support, persistent matches, and a single
authoritative server. The current refactor only keeps the domain portable; it
does not implement multiplayer, authentication, lobbies, WebSockets, or a
remote database.

## Deliberate non-goals

Ranked play, public matchmaking, chat, trading, mobile layout, item crafting,
microservices, and public hosting remain outside the current scope.
