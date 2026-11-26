# Private multiplayer architecture

## MP2 Google sign-in and private lobby

Run `npm run dev:friends` with Node.js 22.16 or later for the authenticated
localhost mode. The Better Auth SQLite adapter and the focused auth tests
use the statement metadata API available from that version. Create a
Google OAuth **Web application** client with the redirect URI
`http://localhost:3000/api/auth/callback/google`. A different local port
requires the same port in the redirect URI and `npm run dev:friends -- <port>`.
Only standard login identity scopes are needed. Better Auth and SQLite run
with the game server. [Google OAuth setup](https://developers.google.com/identity/openid-connect/openid-connect)

Create an ignored `.env.multiplayer.local` with the following settings. Use
a randomly generated, private Better Auth secret with at least 32 characters.

```dotenv
GOOGLE_CLIENT_ID=<your Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<your Google OAuth client secret>
BETTER_AUTH_SECRET=<your private session secret>
```

Place a JSON array of approved Gmail or Google-managed Workspace addresses
in `.codex-local/multiplayer-friends.json`. Set `MULTIPLAYER_FRIENDS_FILE`
to use another local path. The first verified login binds an address to
Google's stable account identifier. Removing an address from the file
revokes its lobby and match access without restarting the server. Keep
`.codex-local/multiplayer-auth.sqlite` private and persistent, or set
`MULTIPLAYER_AUTH_DB` to a different private location.

The first approved captain enters a display name and creates a lobby.
The host shares the link with approved friends and starts with two to eight
connected captains. Bots fill the remaining slots. Lobby and game views
use display names. The room reserves seats through the verified HTTP
session and checks that same session again on the WebSocket. During play
a reload reauthorizes the account and restores its existing seat. The lobby
and round live in memory and the round ends after its first battle.

PAC verifies the account before admitting it to a room and derives the
host from the room owner. MP2 adapts these boundaries to one private lobby,
an operator-managed allowlist and local sessions.
[Pinned PAC preparation room](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/preparation-room.ts#L267)

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
The server derives `actorPlayerId` from the authenticated session, validates the
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
