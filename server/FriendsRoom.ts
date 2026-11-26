import { randomUUID } from "node:crypto";
import { CloseCode, Room, ServerError, type AuthContext, type Client } from "@colyseus/core";
import { CONTENT } from "../game";
import type { AuthorizeFriend, FriendSession } from "./friendAccess";
import {
  applyLocalMatchCommand, createLocalMatch, expireLocalMatch, localMatchSnapshot,
  readLocalMatchCommand, type LocalMatch,
} from "./localMatch";

type ConnectedFriend = {
  client: Client;
  headers: Headers;
  session: FriendSession;
};
type Member = { name: string; connection?: ConnectedFriend; seat?: number; leftAt?: number };
type Lobby = { code: string; host: string; members: Map<string, Member>; match?: LocalMatch };

const reconnectWindow = 30_000;

export function createFriendsRoom(authorize: AuthorizeFriend, roomCreationKey: string) {
  return class FriendsRoom extends Room {
    maxClients = CONTENT.config.playerCount;
    maxMessagesPerSecond = 20;
    autoDispose = false;
    private lobby?: Lobby;
    private readonly connections = new Map<string, ConnectedFriend>();

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
        lobby.match = createLocalMatch(randomUUID(), performance.now(), members.map((member) => member.name));
        this.publish();
      });
      this.onMessage<unknown>("command", async (client, payload) => {
        const friend = await this.checkedConnection(client);
        const lobby = this.lobby;
        if (!friend || !lobby?.match) return;
        const seat = lobby.members.get(friend.session.accountId)?.seat;
        const command = readLocalMatchCommand(payload);
        if (!seat || !command) {
          client.send("command-error", "That action is unavailable.");
          return;
        }
        const previous = lobby.match;
        const result = applyLocalMatchCommand(previous, `player-${seat}`, command, performance.now());
        lobby.match = result.match;
        if (result.error) client.send("command-error", result.error);
        if (previous !== lobby.match) this.publish();
      });
      this.clock.setInterval(() => this.tick(), 100);
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
      if (this.lobby.match?.completed && [...this.lobby.members.values()].every((entry) => !entry.connection)) {
        this.closeLobby();
        return;
      }
      this.publish();
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
      if ([...lobby.members.values()].every(expired) || (!lobby.match && host && expired(host))) {
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
      const next = expireLocalMatch(lobby.match, now);
      if (next === lobby.match) return;
      lobby.match = next;
      this.publish();
    }

    private closeLobby() {
      this.lobby = undefined;
      for (const { client } of this.connections.values()) void client.leave(4004);
    }

    private publish() {
      if (!this.lobby) return;
      for (const member of this.lobby.members.values()) {
        if (member.connection) this.sendSnapshot(member.connection);
      }
    }

    private sendSnapshot(connection: ConnectedFriend) {
      const lobby = this.lobby;
      const seat = lobby?.members.get(connection.session.accountId)?.seat;
      if (!lobby) return;
      connection.client.send("snapshot", lobby.match && seat
        ? localMatchSnapshot(lobby.match, seat, performance.now())
        : {
            status: "lobby",
            code: lobby.code,
            host: lobby.host === connection.session.accountId,
            captains: [...lobby.members.values()].filter((member) => member.connection).map((member) => member.name),
          });
    }
  };
}
