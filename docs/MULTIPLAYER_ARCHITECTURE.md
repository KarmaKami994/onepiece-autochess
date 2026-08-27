# Future private multiplayer architecture

This document is direction only; none of these network features exist in the
current prototype.

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
