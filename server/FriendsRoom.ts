import { randomUUID } from "node:crypto";
import { CloseCode, Room, ServerError, type AuthContext, type Client } from "@colyseus/core";
import { CONTENT } from "../game";
import { FRIENDS_ROOM_UPDATE_MS } from "../app/multiplayer/protocol";
import type { AuthorizeFriend, FriendSession } from "./friendAccess";
import { finishedVoyageExpired, type FriendsVoyageStore, type StoredCommand, type VoyageCheckpoint } from "./friendsVoyageStore";
import {
  applyFriendsCommand, createFriendsVoyage, friendsRegattaFrame, friendsVoyageSnapshot,
  readFriendsCommand, tickFriendsVoyage, type FriendsVoyage,
} from "./friendsVoyage";

type ConnectedFriend = {
  client: Client;
  headers: Headers;
  session: FriendSession;
};
type Member = { name: string; connection?: ConnectedFriend; seat?: number; leftAt?: number; leftResults?: boolean };
type Lobby = {
  code: string;
  host: string;
  members: Map<string, Member>;
  match?: FriendsVoyage;
  revision: number;
  savedAt: number;
  finishedAt: number | null;
};

const reconnectWindow = 30_000;
const checkpointInterval = 1_000;

export function createFriendsRoom(authorize: AuthorizeFriend, roomCreationKey: string, store: FriendsVoyageStore, restored: VoyageCheckpoint | null) {
  return class FriendsRoom extends Room {
    // Keep one transport slot free for a new tab to replace its existing session.
    maxClients = CONTENT.config.playerCount + 1;
    maxMessagesPerSecond = 20;
    autoDispose = false;
    private lobby?: Lobby;
    private readonly connections = new Map<string, ConnectedFriend>();
    private commands = Promise.resolve();
    private storageFailed = false;

    onCreate(options: { roomCreationKey?: string }) {
      if (options.roomCreationKey !== roomCreationKey) {
        throw new ServerError(403, "Only the local server opens the friends room.");
      }
      if (restored) {
        this.lobby = {
          code: restored.code,
          host: restored.host,
          members: new Map(restored.seats.map(({ accountId, name, seat }) => [accountId, { name, seat }])),
          match: restored.voyage,
          revision: restored.revision,
          savedAt: performance.now(),
          finishedAt: restored.finishedAt,
        };
      }
      this.onMessage("sync", async (client) => {
        const friend = await this.checkedConnection(client);
        if (friend) this.sendSnapshot(friend);
      });
      this.onMessage("start", async (client) => {
        const friend = await this.checkedConnection(client);
        const lobby = this.lobby;
        if (!friend || !lobby || lobby.match) return;
        if (lobby.host !== friend.session.accountId) {
          client.send("command-error", "Only the host can start the match.");
          return;
        }
        if (lobby.members.size < 2 || [...lobby.members.values()].some((member) => !member.connection)) {
          client.send("command-error", "At least two captains must be connected to start.");
          return;
        }
        const members = [...lobby.members.values()];
        members.forEach((member, index) => { member.seat = index + 1; });
        const now = performance.now();
        const match = createFriendsVoyage(randomUUID(), now, members.map((member) => member.name));
        if (!this.save(lobby, match, now)) {
          client.send("command-error", "The server could not save the voyage. Try again.");
          return;
        }
        lobby.match = match;
        this.publish();
      });
      this.onMessage<unknown>("command", (client, payload) => {
        // Keep received order even if session validation resolves asynchronously.
        this.commands = this.commands.then(() => this.handleCommand(client, payload)).catch(() => {
          client.send("command-error", "The server could not complete that action.");
        });
      });
      this.clock.setInterval(() => this.tick(), FRIENDS_ROOM_UPDATE_MS);
      this.clock.setInterval(() => {
        for (const { client } of this.connections.values()) void this.checkedConnection(client);
      }, 1_000);
    }

    async onAuth(_client: Client, options: { accountId?: unknown; sessionId?: unknown }, context: AuthContext) {
      const session = await authorize(context.headers);
      if (!session || session.accountId !== options.accountId || session.sessionId !== options.sessionId) {
        throw new ServerError(401, "A reservation from this approved session is required.");
      }
      return { headers: context.headers, session };
    }

    onJoin(client: Client, options: { code?: unknown; create?: unknown; name?: unknown }, identity: {
      headers: Headers; session: FriendSession;
    }) {
      const account = identity.session.accountId;
      const name = typeof options.name === "string" ? options.name.trim() : "";
      const nameValid = !!name && name.length <= 24 && !/[\u0000-\u001f\u007f]/.test(name);
      const finished = this.lobby;
      if (finished?.match?.state.phase === "game-over" && options.create === true && !options.code && nameValid &&
        [...finished.members.values()].every((member) => !member.connection)) {
        if (!this.discardFinishedVoyage(finished)) throw new ServerError(409, "Unable to clear the finished voyage.");
      }
      const existing = this.lobby?.members.get(account);
      if (!existing) {
        if (!nameValid) {
          throw new ServerError(400, "Enter a captain name from 1 to 24 characters.");
        }
        if (!this.lobby && options.create === true) {
          this.lobby = { code: randomUUID(), host: account, members: new Map(), revision: 0, savedAt: 0, finishedAt: null };
        } else if (!this.lobby || this.lobby.match || options.code !== this.lobby.code) {
          throw new ServerError(403, "The lobby is unavailable. Ask the host for its link.");
        }
        if (this.lobby.members.size >= CONTENT.config.playerCount) throw new ServerError(403, "The lobby is full.");
        this.lobby.members.set(account, { name });
      }
      const member = this.lobby?.members.get(account);
      if (!member) throw new ServerError(403, "Lobby membership required.");
      const previous = member.connection;
      const connection = { client, ...identity };
      member.connection = connection;
      member.leftAt = undefined;
      member.leftResults = false;
      this.connections.set(client.sessionId, connection);
      if (previous) void previous.client.leave();
      this.publish();
    }

    onLeave(client: Client, code?: number) {
      const connection = this.connections.get(client.sessionId);
      this.connections.delete(client.sessionId);
      if (!connection || !this.lobby) return;
      const member = this.lobby.members.get(connection.session.accountId);
      if (member?.connection !== connection) return;
      if (!this.lobby.match && (code === CloseCode.CONSENTED || code === 4003)) {
        if (this.lobby.host === connection.session.accountId) {
          this.closeLobby();
          return;
        }
        this.lobby.members.delete(connection.session.accountId);
        this.publish();
        return;
      }
      member.connection = undefined;
      member.leftAt = performance.now();
      if (this.lobby.match?.state.phase === "game-over" && code === CloseCode.CONSENTED) {
        member.leftResults = true;
        if ([...this.lobby.members.values()].every((entry) => entry.leftResults) && this.discardFinishedVoyage(this.lobby)) return;
      }
      this.publish();
    }

    onDispose() {
      const lobby = this.lobby;
      if (lobby?.match) this.save(lobby, lobby.match, performance.now());
      this.lobby = undefined;
    }

    private save(lobby: Lobby, voyage: FriendsVoyage, now: number, command?: StoredCommand): boolean {
      const seats = [...lobby.members].flatMap(([accountId, { name, seat }]) =>
        seat === undefined ? [] : [{ accountId, name, seat }]);
      const finishedAt = voyage.state.phase === "game-over" ? lobby.finishedAt ?? Date.now() : null;
      try {
        lobby.revision = store.write({ code: lobby.code, host: lobby.host, seats, revision: lobby.revision, finishedAt, voyage }, now, command);
        lobby.savedAt = now;
        lobby.finishedAt = finishedAt;
        this.storageFailed = false;
        return true;
      } catch {
        if (!this.storageFailed) console.error("Failed to checkpoint friends voyage " + voyage.state.seed);
        this.storageFailed = true;
        return false;
      }
    }

    private discardFinishedVoyage(lobby: Lobby): boolean {
      if (lobby.match?.state.phase !== "game-over") return false;
      try {
        if (!store.discard(lobby.match.state.seed, lobby.revision)) return false;
        this.closeLobby();
        return true;
      } catch {
        if (!this.storageFailed) console.error("Failed to clear finished friends voyage " + lobby.match.state.seed);
        this.storageFailed = true;
        return false;
      }
    }

    private async handleCommand(client: Client, payload: unknown) {
      const friend = await this.checkedConnection(client);
      const lobby = this.lobby;
      if (!friend || !lobby?.match) return;
      const seat = lobby.members.get(friend.session.accountId)?.seat;
      const command = readFriendsCommand(payload);
      if (!seat || !command) {
        client.send("command-error", "That action is unavailable.");
        return;
      }
      const previous = lobby.match;
      const accountId = friend.session.accountId;
      const prior = store.receipt(previous.state.seed, accountId, command.id);
      if (prior) {
        client.send("command-receipt", prior);
        return;
      }
      const now = performance.now();
      const result = applyFriendsCommand(previous, `player-${seat}`, command, now);
      if (!this.save(lobby, result.voyage, now, { accountId, id: command.id, error: result.error })) {
        client.send("command-error", "The voyage could not be saved. Rejoin to retry the pending action.");
        return;
      }
      lobby.match = result.voyage;
      if (previous !== lobby.match) this.publish(previous);
      client.send("command-receipt", { id: command.id, revision: lobby.revision, error: result.error });
    }

    private async checkedConnection(client: Client): Promise<ConnectedFriend | null> {
      const connection = this.connections.get(client.sessionId);
      if (!connection) return null;
      const current = await authorize(connection.headers).catch(() => null);
      if (this.connections.get(client.sessionId) !== connection ||
          this.lobby?.members.get(connection.session.accountId)?.connection !== connection) return null;
      if (!current || current.accountId !== connection.session.accountId || current.sessionId !== connection.session.sessionId) {
        // Remove it before returning so a queued game command cannot run after revocation.
        this.onLeave(client, 4003);
        void client.leave(4003);
        return null;
      }
      return connection;
    }

    private tick() {
      const lobby = this.lobby;
      if (!lobby) return;
      const now = performance.now();
      const expired = (member: Member) => member.leftAt !== undefined && now - member.leftAt >= reconnectWindow;
      const host = lobby.members.get(lobby.host);
      if (!lobby.match && ([...lobby.members.values()].every(expired) || (host && expired(host)))) {
        this.closeLobby();
        return;
      }
      if (!lobby.match) {
        let changed = false;
        for (const [account, member] of lobby.members) {
          if (expired(member)) changed = lobby.members.delete(account) || changed;
        }
        if (changed) this.publish();
        return;
      }
      const previous = lobby.match;
      if (previous.state.phase === "game-over") {
        if (finishedVoyageExpired(lobby.finishedAt, Date.now()) && [...lobby.members.values()].every((member) => !member.connection)) {
          this.discardFinishedVoyage(lobby);
        }
        return;
      }
      const next = tickFriendsVoyage(previous, now);
      const phaseChanged = previous.state.phase !== next.state.phase || previous.state.round !== next.state.round;
      const regattaClaim = next.state.carouselChoices.some((choice, index) =>
        choice.takenByPlayerId !== previous.state.carouselChoices[index]?.takenByPlayerId && choice.takenByPlayerId !== null);
      // Rewards, phase boundaries and commands are durable before publication.
      // Movement and clock progress get a periodic checkpoint between those writes.
      if ((phaseChanged || regattaClaim || now - lobby.savedAt >= checkpointInterval) && !this.save(lobby, next, now)) return;
      if (next === previous) return;
      lobby.match = next;
      this.publish(previous);
    }

    private closeLobby() {
      this.lobby = undefined;
      for (const { client } of this.connections.values()) void client.leave(4004);
    }

    private publish(previous?: FriendsVoyage) {
      const lobby = this.lobby;
      if (!lobby) return;
      const frame = previous && lobby.match && friendsRegattaFrame(previous, lobby.match);
      for (const member of lobby.members.values()) {
        if (!member.connection) continue;
        if (frame) member.connection.client.send("regatta", frame);
        else this.sendSnapshot(member.connection);
      }
    }

    private sendSnapshot(connection: ConnectedFriend) {
      const lobby = this.lobby;
      const seat = lobby?.members.get(connection.session.accountId)?.seat;
      if (!lobby) return;
      if (lobby.match && seat) {
        connection.client.send("snapshot", {
          ...friendsVoyageSnapshot(lobby.match, seat, performance.now()), lobbyCode: lobby.code, revision: lobby.revision,
        });
      } else {
        connection.client.send("snapshot", {
          status: "lobby",
          code: lobby.code,
          host: lobby.host === connection.session.accountId,
          captains: [...lobby.members.values()].filter((member) => member.connection).map((member) => member.name),
        });
      }
    }
  };
}
