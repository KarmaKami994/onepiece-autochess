# Private multiplayer architecture

## MP5 home hosting

See the [home hosting runbook](MP5_HOME_HOSTING.md) for the production launcher, loopback proxy, Google access gate and browser URL setup.

## MP4 persistent friends voyages

Friends mode stores the active voyage in `.codex-local/multiplayer-voyage.sqlite`. Set `MULTIPLAYER_VOYAGE_DB` in `.env.multiplayer.local` to choose another local path. Each checkpoint carries the match ID, private lobby code, host and seat assignments, revision, phase time, authoritative state, save schema 6, and the content version and hash. The online checkpoint format has its own version.

The room saves the start, phase changes, Regatta claims and every command and receipt before broadcasting the resulting state. A receipt is keyed by match, account and command ID. Retries return the saved receipt. Clock and movement have a periodic checkpoint every second. On restart the server resumes from the stored time and Regatta tick. Downtime is excluded. The newest authorized tab takes the account's existing seat. The invite link remains valid for its original captains.

An incompatible or invalid checkpoint stops friends-server startup with a message. Use the matching game version or select a separate database path.

After all captains leave the results screen, the server removes the completed checkpoint and its command receipts. If a captain loses the connection or misses the results, the server keeps the finished checkpoint until ten minutes after match end and removes it once all captains are disconnected. Startup also clears an expired completed voyage. Creating a fresh lobby can clear a completed voyage once everyone is disconnected. The SQLite database is reused for the next game.

### Back up and restore

The automatic checkpoint covers ordinary server restarts. Use this optional export when you want a separate recovery copy for a server move or maintenance. Manage those exports yourself. The room's cleanup applies only to its live database.

Run these commands in the repository root. Stop the friends server before taking a paired backup to keep the voyage and account files at the same operational point. The backup command accepts an optional source path and requires a new destination. SQLite makes a consistent copy of each database. [Node SQLite backup](https://nodejs.org/api/sqlite.html#sqlitebackupsourceDb-path-options)

```powershell
npm run multiplayer:backup -- .codex-local/backup/voyage.sqlite
npm run multiplayer:backup -- .codex-local/backup/auth.sqlite .codex-local/multiplayer-auth.sqlite
```

Use your configured source paths if they differ. Keep the paired SQLite files, allowlist and server sign-in configuration private. The paired authentication database retains the account IDs required to reclaim saved seats.

To exercise a restore, copy both backups to new files and point a separate localhost process at the copies. Use the original game version and Google redirect for the port you choose. Join from the original lobby link with an approved account to inspect the restored phase, time and inventory.

```powershell
npm run multiplayer:backup -- .codex-local/restore/voyage.sqlite .codex-local/backup/voyage.sqlite
npm run multiplayer:backup -- .codex-local/restore/auth.sqlite .codex-local/backup/auth.sqlite
$env:MULTIPLAYER_VOYAGE_DB = '.codex-local/restore/voyage.sqlite'
$env:MULTIPLAYER_AUTH_DB = '.codex-local/restore/auth.sqlite'
npm run dev:friends -- 3100
```

PAC handles live reconnect by matching the authenticated account with its active room and clearing stale reconnect state. MP4 adapts that seat lookup and adds a local SQLite restart checkpoint suited to one friends server. PAC presence and disposal paths are reference only. [Pinned PAC reconnect flow](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/game-room.ts#L728-L761) · [Pinned PAC disposal](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/game-room.ts#L857-L881)

## MP3 full friends voyage

**Base** `631e72036ce05d58d46b47feb42fb799cd098147`, the MP2 lobby squash on `main`.

- The friends room creates the standard voyage for authenticated human seats and fills the remaining seats with bots. Starter, preparation, PvE/PvP, battle economy, item rewards, Regatta, recruitment, harbor and final placements use the shared engine and screens. The MP1 demo still ends after its first battle.
- The server processes commands in received order and derives the seat from the approved session. Each command carries the player's observed round and phase. After applying any elapsed deadline, the server rejects stale commands, including verbs that are legal in both phases. Online item choices use the 23-second recruitment duration and the existing item-choice fallback.
- Full snapshots are projected for each seat. Regatta steering uses the domain's 50 ms ticks and compact position, claim and event updates every 100 ms. The renderer interpolates between updates. Entering or rejoining the phase receives a full snapshot.
- A disconnected human keeps the seat while the voyage continues. The usual deadlines and default choices apply. The same approved account can rejoin any phase. The battle clock returns at the server's current time. A remounted battle view presents the frozen opening snapshot from the start.

At the pinned PAC revision, the room derives actor identity from the connection and advances the shared phase clock and minigame server-side. MP3 adapts those behaviors using the existing local engine, transport and screens. The PAC dispatcher and room schema are reference only. Bot takeover and external persistence are outside MP3. [PAC commands](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/game-room.ts#L356-L366) · [PAC phase clock](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/app/rooms/commands/game-commands.ts#L1153-L1190)

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
a reload reauthorizes the account and restores its existing seat. MP4 adds
restart recovery for started voyages.

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
