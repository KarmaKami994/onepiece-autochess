import { randomUUID } from "node:crypto";
import { matchMaker, Room, ServerError, type Client } from "@colyseus/core";
import {
  LOCAL_MATCH_ROOM,
  LOCAL_SEATS,
  type LocalMatchSnapshot,
} from "../app/multiplayer/protocol";
import { applyLocalMatchCommand, createLocalMatch, expireLocalMatch, localMatchSnapshot, readLocalMatchCommand, type LocalMatch } from "./localMatch";

const roomCreationKey = randomUUID();
const reconnectSeconds = 30;

export function openLocalMatchRoom() {
  return matchMaker.createRoom(LOCAL_MATCH_ROOM, { roomCreationKey });
}

export class LocalMatchRoom extends Room {
  maxClients = LOCAL_SEATS;
  autoDispose = false;
  maxMessagesPerSecond = 20;
  private readonly seats = new Map<string, number>();
  private match?: LocalMatch;

  onCreate(options: { roomCreationKey?: string }) {
    if (options.roomCreationKey !== roomCreationKey) {
      throw new ServerError(403, "The development server opens the local match room.");
    }
    this.onMessage("sync", (client) => this.sendSnapshot(client));
    this.onMessage<unknown>("command", (client, payload) => {
      const seat = this.seats.get(client.sessionId);
      if (!seat || !this.match) return;
      const command = readLocalMatchCommand(payload);
      if (!command) {
        client.send("command-error", "That action is unavailable in this local match.");
        return;
      }
      const previous = this.match;
      const result = applyLocalMatchCommand(previous, `player-${seat}`, command, performance.now());
      this.match = result.match;
      if (result.error) client.send("command-error", result.error);
      if (previous !== this.match) this.publish();
    });
    this.clock.setInterval(() => {
      if (!this.match) return;
      const next = expireLocalMatch(this.match, performance.now());
      if (next === this.match) return;
      this.match = next;
      this.publish();
    }, 100);
  }

  onJoin(client: Client) {
    if (this.match) throw new ServerError(403, "Both captains have seats in the current local match.");
    const taken = new Set(this.seats.values());
    const seat = taken.has(1) ? 2 : 1;
    this.seats.set(client.sessionId, seat);
    if (this.seats.size === LOCAL_SEATS) {
      this.match = createLocalMatch(randomUUID(), performance.now());
      this.publish();
    }
  }

  async onDrop(client: Client) {
    try {
      await this.allowReconnection(client, reconnectSeconds);
    } catch {
      // Colyseus calls onLeave when the reservation expires.
    }
  }

  onLeave(client: Client) {
    this.seats.delete(client.sessionId);
    if (this.seats.size === 0) this.match = undefined;
  }

  private publish() {
    this.clients.forEach((client) => this.sendSnapshot(client));
  }

  private sendSnapshot(client: Client) {
    const seat = this.seats.get(client.sessionId);
    if (!seat) return;
    const match = this.match;
    const snapshot: LocalMatchSnapshot = !match
      ? { status: "waiting", captain: seat }
      : localMatchSnapshot(match, seat, performance.now());
    client.send("snapshot", snapshot);
  }
}
