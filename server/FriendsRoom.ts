import { randomUUID } from "node:crypto";
import { CloseCode, Room, ServerError, type AuthContext, type Client } from "@colyseus/core";
import { CONTENT } from "../game";
import { FRIENDS_ROOM_UPDATE_MS } from "../app/multiplayer/protocol";
import type { AuthorizeFriend, FriendSession } from "./friendAccess";
import {
  applyFriendsCommand, createFriendsVoyage, friendsRegattaFrame, friendsVoyageSnapshot,
  readFriendsCommand, tickFriendsVoyage, type FriendsVoyage,
} from "./friendsVoyage";

type ConnectedFriend = {
  client: Client;
  headers: Headers;
  session: FriendSession;
};
type Member = { name: string; connection?: ConnectedFriend; seat?: number; leftAt?: number };
type Lobby = { code: string; host: string; members: Map<string, Member>; match?: FriendsVoyage };

const reconnectWindow = 30_000;

export function createFriendsRoom(authorize: AuthorizeFriend, roomCreationKey: string) {
  return class FriendsRoom extends Room {
    maxClients = CONTENT.config.playerCount;
    maxMessagesPerSecond = 20;
    autoDispose = false;
    private lobby?: Lobby;
    private readonly connections = new Map<string, ConnectedFriend>();
    private commands = Promise.resolve();

    onCreate(options: { roomCreationKey?: string }) {
      if (options.roomCreationKey !== roomCreationKey) {
        throw new ServerError(403, "Only the local server opens the friends room.");
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
        lobby.match = createFriendsVoyage(randomUUID(), performance.now(), members.map((member) => member.name));
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
      const existing = this.lobby?.members.get(account);
      if (!existing) {
        const name = typeof options.name === "string" ? options.name.trim() : "";
        if (!name || name.length > 24 || /[\u0000-\u001f\u007f]/.test(name)) {
          throw new ServerError(400, "Enter a captain name from 1 to 24 characters.");
        }
        if (!this.lobby && options.create === true) {
          this.lobby = { code: randomUUID(), host: account, members: new Map() };
        } else if (!this.lobby || this.lobby.match || options.code !== this.lobby.code) {
          throw new ServerError(403, "The lobby is unavailable. Ask the host for its link.");
        }
        if (this.lobby.members.size >= this.maxClients) throw new ServerError(403, "The lobby is full.");
        this.lobby.members.set(account, { name });
      }
      const member = this.lobby?.members.get(account);
      if (!member) throw new ServerError(403, "Lobby membership required.");
      const previous = member.connection;
      const connection = { client, ...identity };
      member.connection = connection;
      member.leftAt = undefined;
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
      if (this.lobby.match?.state.phase === "game-over" && [...this.lobby.members.values()].every((entry) => !entry.connection)) {
        this.closeLobby();
        return;
      }
      this.publish();
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
      const result = applyFriendsCommand(previous, `player-${seat}`, command, performance.now());
      lobby.match = result.voyage;
      if (result.error) client.send("command-error", result.error);
      if (previous !== lobby.match) this.publish(previous);
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
      const next = tickFriendsVoyage(previous, now);
      if (next === previous) return;
      lobby.match = next;
      if (next.state.phase === "game-over" && [...lobby.members.values()].every((member) => !member.connection)) {
        this.closeLobby();
        return;
      }
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
      connection.client.send("snapshot", lobby.match && seat
        ? friendsVoyageSnapshot(lobby.match, seat, performance.now())
        : {
            status: "lobby",
            code: lobby.code,
            host: lobby.host === connection.session.accountId,
            captains: [...lobby.members.values()].filter((member) => member.connection).map((member) => member.name),
          });
    }
  };
}
