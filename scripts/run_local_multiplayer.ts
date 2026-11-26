import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { openFriendAccess } from "../server/friendAccess";
import { startLocalMultiplayer } from "../server/startLocalMultiplayer";

async function start() {
  const friendsMode = process.argv[2] === "--friends";
  const appPort = Number(process.argv[friendsMode ? 3 : 2] ?? 3000);
  if (!Number.isInteger(appPort) || appPort < 1024 || appPort > 65535) {
    throw new RangeError("Pass a localhost web port between 1024 and 65535.");
  }
  const origin = `http://localhost:${appPort}`;
  if (friendsMode && existsSync(".env.multiplayer.local")) process.loadEnvFile(".env.multiplayer.local");
  const access = friendsMode ? await openFriendAccess(origin) : undefined;
  const server = await startLocalMultiplayer(origin, access, process.env.MULTIPLAYER_VOYAGE_DB).catch((error: unknown) => {
    access?.close();
    throw error;
  });

  const webEnv: NodeJS.ProcessEnv = { ...process.env, MP1_LOCAL_SERVER_PORT: String(server.port), MP2_FRIENDS_ENABLED: access ? "1" : "" };
  delete webEnv.GOOGLE_CLIENT_SECRET;
  delete webEnv.BETTER_AUTH_SECRET;
  const web = spawn(process.execPath, [
    "node_modules/vinext/dist/cli.js", "dev", "--host", "localhost", "--port", String(appPort),
  ], {
    stdio: "inherit",
    env: webEnv,
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
    await server.close();
    access?.close();
  }
}

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
