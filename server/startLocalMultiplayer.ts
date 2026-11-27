import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { defineRoom, defineServer, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { toNodeHandler } from "better-auth/node";
import { FRIENDS_MATCH_ROOM, LOCAL_MATCH_ROOM } from "../app/multiplayer/protocol";
import { createFriendsRoom } from "./FriendsRoom";
import { DEFAULT_FRIENDS_VOYAGE_DB, finishedVoyageExpired, openFriendsVoyageStore, type VoyageCheckpoint } from "./friendsVoyageStore";
import { createHostedFriendsAccess } from "./hostedFriendsAccess";
import type { openFriendAccess } from "./friendAccess";
import { LocalMatchRoom, openLocalMatchRoom } from "./LocalMatchRoom";

type FriendsAccess = Pick<Awaited<ReturnType<typeof openFriendAccess>>, "auth" | "authorize">;

export async function startLocalMultiplayer(
  origin: string,
  access?: FriendsAccess,
  databasePath = DEFAULT_FRIENDS_VOYAGE_DB,
  listenPort = 0,
) {
  const store = access && openFriendsVoyageStore(databasePath);
  let restored: VoyageCheckpoint | null;
  try {
    restored = store?.read(performance.now()) ?? null;
    if (store && restored && finishedVoyageExpired(restored.finishedAt, Date.now())) {
      if (!store.discard(restored.voyage.state.seed, restored.revision)) throw new Error("Could not clear the expired friends voyage.");
      restored = null;
    }
  } catch (error) {
    store?.close();
    throw error;
  }
  const roomCreationKey = randomUUID();
  if (access) matchMaker.controller.exposedMethods = [];
  const httpServer = createServer();
  let ready = false;
  const hostedAccess = access && listenPort ? createHostedFriendsAccess(origin, access.authorize) : undefined;
  const server = defineServer({
    rooms: access && store
      ? { [FRIENDS_MATCH_ROOM]: defineRoom(createFriendsRoom(access.authorize, roomCreationKey, store, restored)) }
      : { [LOCAL_MATCH_ROOM]: defineRoom(LocalMatchRoom) },
    express: access ? (app) => {
      app.use((request: IncomingMessage, response: ServerResponse, next: () => void) => {
        const requestOrigin = request.headers.origin;
        if (requestOrigin && requestOrigin !== origin) {
          response.writeHead(403).end();
          return;
        }
        next();
      });
      app.all(/^\/api\/auth(?:\/|$)/, toNodeHandler(access.auth));
      if (hostedAccess) {
        app.get("/friends/access", toNodeHandler({ handler: hostedAccess.check }));
        app.get("/friends-sign-in", toNodeHandler({ handler: hostedAccess.signIn }));
        app.get("/friends-sign-in.js", toNodeHandler({ handler: hostedAccess.script }));
      }
      app.get("/healthz", (_request, response) => {
        response.setHeader("Cache-Control", "no-store");
        response.status(ready ? 200 : 503).json({ status: ready ? "ready" : "starting" });
      });
      app.get("/friends/session", toNodeHandler({ handler: async (request) => {
        const session = await access.authorize(request.headers);
        return Response.json({ approved: Boolean(session) }, { headers: { "Cache-Control": "no-store" } });
      } }));
      app.post("/friends/join", toNodeHandler({ handler: async (request) => {
        if (request.headers.get("origin") !== origin) return new Response(null, { status: 403 });
        const session = await access.authorize(request.headers);
        if (!session) return new Response(null, { status: 401 });
        const length = Number(request.headers.get("content-length"));
        if (!Number.isSafeInteger(length) || length < 1 || length > 1024) return new Response(null, { status: 400 });
        const input: unknown = await request.json().catch(() => null);
        if (!input || typeof input !== "object" || Array.isArray(input)) return new Response(null, { status: 400 });
        const options = input as Record<string, unknown>;
        try {
          return Response.json(await matchMaker.join(FRIENDS_MATCH_ROOM, {
            code: options.code, create: options.create, name: options.name,
            accountId: session.accountId, sessionId: session.sessionId,
          }), { headers: { "Cache-Control": "no-store" } });
        } catch {
          return new Response(null, { status: 409 });
        }
      } }));
    } : undefined,
    transport: new WebSocketTransport({
      server: httpServer,
      beforeUpgrade: async (request) => {
        if (request.headers.get("origin") !== origin) {
          return new Response("Local multiplayer is available only through the development app.", { status: 403 });
        }
        if (access && !await access.authorize(request.headers)) return new Response(null, { status: 401 });
      },
    }),
    greet: false,
    gracefullyShutdown: false,
  });
  const close = async () => {
    ready = false;
    try {
      await server.gracefullyShutdown(false);
    } finally {
      store?.close();
    }
  };
  try {
    await server.listen(listenPort, "127.0.0.1");
    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("The loopback match server did not bind.");
    if (access) await matchMaker.createRoom(FRIENDS_MATCH_ROOM, { roomCreationKey });
    else await openLocalMatchRoom();
    ready = true;
    return { port: address.port, close };
  } catch (error) {
    await close();
    throw error;
  }
}
