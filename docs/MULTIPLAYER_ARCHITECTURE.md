# Private multiplayer architecture

## MP1 local development

Run `npm run dev:multiplayer`, open `http://localhost:3000`, and choose Local
Multiplayer in two independent browser windows or profiles. Each captain
joins once. The room starts round 1 at preparation with two captains and six
bots. Both captains can recruit and deploy. Their readiness or the server's
preparation deadline starts the same round for both. After the first battle,
both return to the menu to release the room for another session.

The launcher binds Vinext and Colyseus to loopback. A development proxy
routes both matchmaking and WebSocket traffic through the same browser
origin. At most two captains have seats in the room. A reload can reclaim a
seat for 30 seconds with the Colyseus reconnect token held in that tab.
The multiplayer room is in memory. Start the ordinary offline app with
`npm run dev` and use the existing local saves as before.

The room uses the official Colyseus starter's server, room and transport
pattern with pinned packages. The browser sends typed commands and receives
one view for its own seat. Rival scouting includes the deployed roster but
excludes reserves and loose inventory. The server drives the deadline even
with the tab in the background.

At the pinned PAC source, the server receives shop and drag intent and owns
room clocks. MP1 adapts those boundaries to the existing local engine and
ready policy. PAC's account and public room infrastructure is reference
material for later batches. [Colyseus starter](https://github.com/colyseus/create-colyseus-app) ·
[Pinned PAC game room](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/game-room.ts)

## Friends-only target

Use one authoritative server for a small friends-only match:

```text
React/Phaser clients
        ↓ WebSocket
authoritative match process
        ↓
same platform-neutral game domain
        ↓
ordinary persistent database
```

Clients send serializable action intent and display server snapshots/events.
After MP2, the server derives `actorPlayerId` from the authenticated session, validates the
command, owns RNG state, ticks, timers, economy, pairings, combat results, and
save checkpoints, then broadcasts accepted state. A client-supplied player ID
must never authorize an action.

WebSocket is the recommended live transport; normal HTTP can handle invites and
session setup. A conventional relational database is sufficient for users,
invites, and resumable match snapshots. Reconnect should restore the latest
authoritative checkpoint and continue from explicit ticks.

Do not introduce microservices, event sourcing, Redis, Kafka, client-authority,
or separate rule implementations. The existing domain API is the shared rules
boundary.
