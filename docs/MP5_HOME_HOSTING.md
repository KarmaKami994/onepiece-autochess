# MP5 home hosting

The production launcher runs the built web app and the persistent friends room on loopback ports. A single reverse proxy presents the same origin for the game, assets, Google callback and WebSocket. The Google allowlist gates the game and assets before they reach the web server.

| Endpoint | Default listener | Purpose |
| --- | --- | --- |
| Reverse proxy | `127.0.0.1:3000` | Browser entry and optional HTTPS tunnel target |
| Built web app | `127.0.0.1:3100` | Application and assets behind the access gate |
| Friends server | `127.0.0.1:3101` | OAuth, authorized reservations, game sockets and health |

## Prepare a release locally on the server

1. Record the intended Git commit, OS and architecture. Use Node 22.23.5, the version used by CI. Keep the Node, Caddy and optional tunnel processes on the same host for the sample loopback setup.
2. Run `npm ci --include=dev` and `npm run build` from the release directory. The repository's pinned Vinext and `tsx` need to be present at runtime.
3. Use `deploy/friends.env.example` as a template for the private `.env.multiplayer.local` or service environment. Set the Google client, a private Better Auth secret and the allowlist. Keep the authentication and voyage databases in a persistent directory. Use a single friends process per voyage database.
4. Start `npm run start:friends` and the reverse proxy with `caddy run --config deploy/Caddyfile --adapter caddyfile`. When changing an upstream port, give the same value to the launcher and the Caddy process. Keep the sample upstreams on loopback.
5. For the local launch, use `http://localhost:3000` as the browser origin and `http://localhost:3000/api/auth/callback/google` as the authorized Google redirect. With the local server running, `/healthz` reports room readiness. A guest browser is redirected to the sign-in page. Requests for assets and WebSocket seats require approval. [Vinext production server](https://github.com/cloudflare/vinext#cli-reference) · [Caddy authentication gateway](https://caddyserver.com/docs/caddyfile/directives/forward_auth)

A Linux systemd template is available at `deploy/grand-line-friends.service`. Create the dedicated unprivileged `grandline` account, put the release in `/opt/grand-line`, and put the allowlist at `/var/lib/grand-line/friends.json`. Keep `/etc/grand-line/friends.env` owner-readable and set the Google credentials and origin there. The unit creates its persistent state directory and supplies the database and allowlist paths. If you copy the environment template to this location, remove its three relative state paths or replace them with the `/var/lib/grand-line` paths in the unit. Adjust `ExecStart` to the actual Node installation. Validate and enable the unit using the host service manager. Run Caddy through the existing proxy manager or a separate unit so it can restart independently. The backup and restore instructions remain in [the multiplayer architecture notes](MULTIPLAYER_ARCHITECTURE.md).

## Pick the browser URL

Tailscale Funnel is a candidate when the host already uses Tailscale and the group has no domain. It supplies a `*.ts.net` HTTPS hostname for ordinary browsers. Before enabling a Funnel, verify its availability on the host and that Google accepts `https://<assigned-host>/api/auth/callback/google` for the Web application client. Then set `MULTIPLAYER_PUBLIC_ORIGIN` to that exact HTTPS origin and point the Funnel at the protected loopback gateway. The Funnel endpoint is reachable from the Internet. The gateway serves the game and assets only after Google sign-in and allowlist approval. [Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel) · [Google redirect URI rules](https://developers.google.com/identity/protocols/oauth2/web-server#uri-validation)

## Isolated Cloudflare playtest

`deploy/compose.playtest.yaml` runs the prebuilt Linux release and Caddy in one Docker network namespace. The app and room listen on loopback inside that namespace. Only Caddy listens on the project's Docker bridge, and the stack publishes no host ports. The optional tunnel connector has its own container and only shares that bridge. The game uses one writable private state directory for SQLite and the friends allowlist. The release and proxy config are read-only mounts.

Set `GRAND_LINE_RELEASE_DIR`, `GRAND_LINE_STATE_DIR`, `GRAND_LINE_CADDYFILE` and `GRAND_LINE_PUBLIC_ORIGIN` in a private Compose environment file. Use a release built for the host's Linux architecture and keep its `.env.multiplayer.local` owner-readable. Set `GRAND_LINE_UID` and `GRAND_LINE_GID` if the files belong to a user other than `1000:1000`. From the directory holding the two deployment files and `playtest.env`, start the private stack with `sudo docker compose --env-file playtest.env -f compose.playtest.yaml up -d game proxy`.

Keep the playtest hostname on a dedicated tunnel and configure an exact-host Cloudflare Access allow policy before publication. The OAuth redirect must be `https://<playtest-host>/api/auth/callback/google`, with `GRAND_LINE_PUBLIC_ORIGIN` set to the corresponding HTTPS origin. After owner approval, store the tunnel token in a private file at `GRAND_LINE_TUNNEL_TOKEN_FILE` and enable the `cloudflare` Compose profile. Publish only the playtest hostname to `http://game:3000` and configure **Protect with Access** for the playtest application so the connector validates its Access token. Keep every other project on its existing routes and network. [Cloudflare Access for self-hosted apps](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/) · [Cloudflare tunnel run parameters](https://developers.cloudflare.com/tunnel/reference/run-parameters/)

After approval, check the public TLS hostname, a Google sign-in and a second approved seat in separate browsers. Check guest asset denial, rejected non-allowlisted login, WebSocket joining, reload and service restart. Keep any provider credentials and privately sourced assets within the approved friends deployment.

PAC's pinned production setup packages an application and separately configured persistent services. MP5 adapts release packaging and service restart behavior to the existing single-host Node and SQLite setup. PAC's Firebase and MongoDB infrastructure stays reference only. [Pinned PAC Compose setup](https://github.com/keldaanCommunity/pokemonAutoChess/blob/a3fa225e11f49c07e8ac7bdf262773d4cc4a94ee/docker-compose.yaml)
