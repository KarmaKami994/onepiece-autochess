import { createHmac, randomUUID } from "node:crypto";
import { mkdtemp, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Room, SeatReservation } from "@colyseus/sdk";
import { describe, expect, it, vi } from "vitest";
import type { LocalMatchSnapshot } from "../app/multiplayer/protocol";
import { createFriendAllowlist, openFriendAccess, verifiedGoogleIdentity } from "../server/friendAccess";
import { startLocalMultiplayer } from "../server/startLocalMultiplayer";

const origin = "http://localhost:3000";

describe("MP2 friends access", () => {
  it("only accepts emails for which Google is authoritative", () => {
    expect(verifiedGoogleIdentity({ email: " Crew@Gmail.com ", sub: "first", email_verified: true }))
      .toEqual({ email: "crew@gmail.com", subject: "first" });
    expect(verifiedGoogleIdentity({ email: "crew@example.org", sub: "first", email_verified: true, hd: "example.org" }))
      .toEqual({ email: "crew@example.org", subject: "first" });
    expect(verifiedGoogleIdentity({ email: "crew@example.org", sub: "first", email_verified: true })).toBeNull();
    expect(verifiedGoogleIdentity({ email: "crew@gmail.com", sub: "first", email_verified: false })).toBeNull();
  });

  it("binds a listed address to its first Google account and enforces removal", () => {
    const db = new DatabaseSync(":memory:");
    try {
      let addresses: unknown = ["crew@gmail.com", "next@gmail.com"];
      const access = createFriendAllowlist(db, () => addresses);
      expect(access.bind("crew@gmail.com", "first")).toBe(true);
      expect(access.bind("crew@gmail.com", "different")).toBe(false);
      expect(access.bind("next@gmail.com", "first")).toBe(false);
      addresses = [];
      expect(access.allows("crew@gmail.com", "first")).toBe(false);
      addresses = ["crew@gmail.com"];
      expect(access.allows("crew@gmail.com", "first")).toBe(true);
      const reopened = createFriendAllowlist(db, () => addresses);
      expect(reopened.allows("crew@gmail.com", "first")).toBe(true);
      expect(reopened.bind("crew@gmail.com", "different")).toBe(false);
    } finally {
      db.close();
    }
  });

  it("authorizes HTTP and room seats, limits start to the host and revokes live access", async () => {
    const dir = await mkdtemp(join(tmpdir(), "autochess-mp2-"));
    const friendsFile = join(dir, "friends.json");
    const secret = randomUUID() + randomUUID();
    vi.stubEnv("GOOGLE_CLIENT_ID", "local-test-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "local-test-provider-secret");
    vi.stubEnv("BETTER_AUTH_SECRET", secret);
    vi.stubEnv("MULTIPLAYER_AUTH_DB", ":memory:");
    vi.stubEnv("MULTIPLAYER_FRIENDS_FILE", friendsFile);
    const rooms: Room[] = [];
    let access: Awaited<ReturnType<typeof openFriendAccess>> | undefined;
    let server: Awaited<ReturnType<typeof startLocalMultiplayer>> | undefined;
    try {
      await writeFile(friendsFile, '["host@gmail.com","mate@gmail.com"]');
      access = await openFriendAccess(origin);
      const context = await access.auth.$context;
      const profileMapper = access.auth.options.socialProviders.google.mapProfileToUser;

      async function fixture(email: string, subject: string, enroll = true) {
        // Simulate the trusted identity returned by Google; issue a real Better Auth session.
        const profile = {
          aud: "local-test-client", azp: "local-test-client", email, sub: subject,
          email_verified: true, name: subject, given_name: subject, family_name: "",
          iss: "https://accounts.google.com", iat: 0, exp: 1, picture: "",
        };
        if (enroll) await profileMapper?.(profile);
        const user = await context.internalAdapter.createUser(
          { email, emailVerified: true, name: subject },
          { method: "oauth", oauth: { providerId: "google", profile } },
        );
        await context.internalAdapter.linkAccount({ providerId: "google", accountId: subject, userId: user.id });
        const session = await context.internalAdapter.createSession(user.id);
        const signature = createHmac("sha256", secret).update(session.token).digest("base64");
        return `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`;
      }

      const hostCookie = await fixture("host@gmail.com", "host-google");
      const mateCookie = await fixture("mate@gmail.com", "mate-google");
      const outsiderCookie = await fixture("other@gmail.com", "other-google", false);
      server = await startLocalMultiplayer(origin, access, ":memory:");
      const url = `http://127.0.0.1:${server.port}`;
      vi.stubGlobal("WebSocket", undefined);
      const { Client } = await import("@colyseus/sdk");
      const reserve = (cookie: string, body: object, browserOrigin = origin) => fetch(`${url}/friends/join`, {
        method: "POST",
        headers: { cookie, origin: browserOrigin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const joinRoom = async (cookie: string, options: object) => {
        const response = await reserve(cookie, options);
        expect(response.status).toBe(200);
        const reservation: SeatReservation = await response.json();
        const client = new Client(url, { headers: { origin, cookie } });
        const room = await client.consumeSeatReservation(reservation);
        room.reconnection.enabled = false;
        rooms.push(room);
        return room;
      };
      const snapshot = (room: Room) => new Promise<LocalMatchSnapshot>((resolve) => {
        room.onMessage<LocalMatchSnapshot>("snapshot", (value) => resolve(value));
        room.send("sync");
      });

      expect((await reserve("", { create: true, name: "Mara" })).status).toBe(401);
      expect((await reserve(outsiderCookie, { create: true, name: "Mara" })).status).toBe(401);
      expect((await reserve(hostCookie, { create: true, name: "Mara" }, "http://localhost:3101")).status).toBe(403);
      expect((await fetch(`${url}/friends/session`, {
        headers: { cookie: hostCookie, origin: "http://localhost:3101" },
      })).status).toBe(403);
      const signIn = await fetch(`${url}/api/auth/sign-in/social`, {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL: `${origin}/multiplayer` }),
      });
      expect(signIn.status).toBe(200);
      const destination = new URL((await signIn.json()).url);
      expect(destination.hostname).toBe("accounts.google.com");
      expect(destination.searchParams.get("redirect_uri")).toBe(`${origin}/api/auth/callback/google`);

      const host = await joinRoom(hostCookie, { create: true, name: "Mara" });
      const lobby = await snapshot(host);
      expect(lobby).toMatchObject({ status: "lobby", host: true, captains: ["Mara"] });
      if (lobby.status !== "lobby") throw new Error("The host did not receive a lobby.");
      expect((await reserve(outsiderCookie, { code: lobby.code, name: "Other" })).status).toBe(401);
      const mate = await joinRoom(mateCookie, { code: lobby.code, name: "Taro", accountId: "host" });
      expect(await snapshot(mate)).toMatchObject({ status: "lobby", host: false, captains: ["Mara", "Taro"] });
      const denied = new Promise<string>((resolve) => { mate.onMessage<string>("command-error", resolve); });
      mate.send("start");
      expect(await denied).toBe("Only the host can start the match.");

      host.send("start");
      await expect.poll(async () => (await snapshot(mate)).status).toBe("playing");
      expect(await snapshot(host)).toMatchObject({ status: "playing", view: { playerId: "player-1", phase: "starter-choice" } });
      expect(await snapshot(mate)).toMatchObject({ status: "playing", view: { playerId: "player-2", phase: "starter-choice" } });
      await mate.leave(false);
      const rejoined = await joinRoom(mateCookie, { code: lobby.code, name: "Different display name" });
      expect(await snapshot(rejoined)).toMatchObject({ status: "playing", view: { playerId: "player-2" } });
      const starter = { round: 1, phase: "starter-choice", command: { type: "CHOOSE_STARTER_RECRUIT", definitionId: null } };
      host.send("command", { ...starter, id: randomUUID() });
      rejoined.send("command", { ...starter, id: randomUUID() });
      await expect.poll(async () => snapshot(host)).toMatchObject({ status: "playing", view: { phase: "preparation" } });
      const purchase = { id: randomUUID(), round: 1, phase: "preparation", command: { type: "BUY_UNIT", shopIndex: 0 } };
      function sendPurchase() {
        const receipt = new Promise<{ id: string; revision: number; error?: string }>((resolve) => {
          host.onMessage<{ id: string; revision: number; error?: string }>("command-receipt", (value) => {
            if (value.id === purchase.id) resolve(value);
          });
        });
        host.send("command", purchase);
        return receipt;
      }
      const firstReceipt = await sendPurchase();
      expect(firstReceipt.error).toBeUndefined();
      expect(await sendPurchase()).toEqual(firstReceipt);
      const afterPurchase = await snapshot(host);
      if (afterPurchase.status !== "playing") throw new Error("Host lost the voyage after buying.");
      expect(afterPurchase.view.shop[0]).toBeNull();

      const disconnected = new Promise<number>((resolve) => { rejoined.onLeave(resolve); });
      await writeFile(friendsFile, '["host@gmail.com"]');
      expect(await disconnected).toBe(4003);
      expect((await reserve(mateCookie, { code: lobby.code, name: "Taro" })).status).toBe(401);
      expect(await snapshot(host)).toMatchObject({ status: "playing", view: { playerId: "player-1" } });
    } finally {
      await Promise.allSettled(rooms.map((room) => room.leave()));
      await server?.close();
      access?.close();
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
      await unlink(friendsFile);
      await rmdir(dir);
    }
  }, 20_000);
});
