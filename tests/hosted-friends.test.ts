import { describe, expect, it } from "vitest";
import { createHostedFriendsAccess } from "../server/hostedFriendsAccess";
import { readHostedFriendsConfig } from "../server/hostedFriendsConfig";

const origin = "https://game.example.com";

describe("MP5 hosted friends configuration", () => {
  it("defaults to local HTTP for setup and accepts one canonical HTTPS origin", () => {
    expect(readHostedFriendsConfig({})).toEqual({ origin: "http://localhost:3000", webPort: 3100, roomPort: 3101 });
    expect(readHostedFriendsConfig({ MULTIPLAYER_PUBLIC_ORIGIN: origin + "/", MULTIPLAYER_WEB_PORT: "3200" }))
      .toEqual({ origin, webPort: 3200, roomPort: 3101 });
  });

  it("rejects public HTTP, ambiguous OAuth origins and duplicate local ports", () => {
    for (const value of ["http://game.example.com", "https://192.0.2.12", origin + "/game", origin + "?auth=1", "https://user@game.example.com"]) {
      expect(() => readHostedFriendsConfig({ MULTIPLAYER_PUBLIC_ORIGIN: value })).toThrow("origin");
    }
    expect(() => readHostedFriendsConfig({ MULTIPLAYER_ROOM_PORT: "3100" })).toThrow("different loopback ports");
    expect(() => readHostedFriendsConfig({ MULTIPLAYER_PUBLIC_ORIGIN: "http://localhost:3101" })).toThrow("separate public port");
    expect(() => readHostedFriendsConfig({ MULTIPLAYER_WEB_PORT: "80" })).toThrow("MULTIPLAYER_WEB_PORT");
  });
});

describe("MP5 hosted friends access", () => {
  const invite = "/multiplayer?lobby=4d17c9e8-9ea5-47eb-bf26-daac553bf048";
  const guest = createHostedFriendsAccess(origin, async () => null);

  it("keeps a valid invite through sign-in and rejects direct guest asset requests", async () => {
    const response = await guest.check(new Request(origin + "/friends/access", {
      headers: { accept: "text/html", "x-forwarded-method": "GET", "x-forwarded-uri": invite },
    }));
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.origin).toBe(origin);
    expect(location.searchParams.get("next")).toBe(invite);
    const page = await guest.signIn(new Request(location));
    expect(await page.text()).toContain(`data-target="${invite}"`);
    expect(await guest.check(new Request(origin + "/friends/access", {
      headers: { accept: "image/*", "x-forwarded-method": "GET", "x-forwarded-uri": "/assets/friends-harbor.webp" },
    }))).toMatchObject({ status: 401 });
  });

  it("accepts only an approved session and keeps sign-in destinations on the same origin", async () => {
    const approved = createHostedFriendsAccess(origin, async () => ({ accountId: "approved", sessionId: "session" }));
    expect(await approved.check(new Request(origin + "/friends/access"))).toMatchObject({ status: 204 });
    const response = await approved.signIn(new Request(origin + "/friends-sign-in?next=https%3A%2F%2Fother.example%2Fmultiplayer"));
    expect(response.headers.get("location")).toBe(origin + "/multiplayer");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
