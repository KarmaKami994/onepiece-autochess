import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { defineRoom, defineServer } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { LOCAL_MATCH_ROOM } from "../app/multiplayer/protocol";
import { LocalMatchRoom, openLocalMatchRoom } from "../server/LocalMatchRoom";

async function start() {
  const appPort = Number(process.argv[2] ?? 3000);
  if (!Number.isInteger(appPort) || appPort < 1024 || appPort > 65535) {
    throw new RangeError("Pass a localhost web port between 1024 and 65535.");
  }
  const origin = `http://localhost:${appPort}`;
  const httpServer = createServer();
  // The Vite proxy and the browser both use the same loopback origin.
  const server = defineServer({
    rooms: { [LOCAL_MATCH_ROOM]: defineRoom(LocalMatchRoom) },
    transport: new WebSocketTransport({
      server: httpServer,
      beforeUpgrade: (request) => {
        if (request.headers.get("origin") !== origin) {
          return new Response("Local multiplayer is available only through the development app.", { status: 403 });
        }
      },
    }),
    greet: false,
    gracefullyShutdown: false,
  });
  await server.listen(0, "127.0.0.1");
  const address = httpServer.address();
  if (!address || typeof address === "string") throw new Error("The loopback match server did not bind.");
  await openLocalMatchRoom();

  const web = spawn(process.execPath, [
    "node_modules/vinext/dist/cli.js", "dev", "--host", "localhost", "--port", String(appPort),
  ], {
    stdio: "inherit",
    env: { ...process.env, MP1_LOCAL_SERVER_PORT: String(address.port) },
  });
  const stop = () => web.kill();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    await new Promise<void>((resolve, reject) => {
      web.once("error", reject);
      web.once("exit", (code) => {
        process.exitCode = code ?? 0;
        resolve();
      });
    });
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    await server.gracefullyShutdown(false);
  }
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
