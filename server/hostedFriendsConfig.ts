import { isIP } from "node:net";

export type HostedFriendsConfig = { origin: string; webPort: number; roomPort: number };

function readPort(value: string | undefined, fallback: number, key: string): number {
  if (value === undefined) return fallback;
  const port = Number(value);
  if (!/^[0-9]+$/.test(value) || !Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new RangeError(key + " must be an integer from 1024 to 65535.");
  }
  return port;
}

export function readHostedFriendsConfig(env: Readonly<Record<string, string | undefined>>): HostedFriendsConfig {
  let url: URL;
  try {
    url = new URL(env.MULTIPLAYER_PUBLIC_ORIGIN ?? "http://localhost:3000");
  } catch {
    throw new Error("MULTIPLAYER_PUBLIC_ORIGIN must be a full URL.");
  }
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    (!loopback && isIP(url.hostname.replace(/^\[|\]$/g, "")) !== 0) ||
    url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("MULTIPLAYER_PUBLIC_ORIGIN must be an HTTPS origin, or a loopback HTTP origin for local setup.");
  }
  const webPort = readPort(env.MULTIPLAYER_WEB_PORT, 3100, "MULTIPLAYER_WEB_PORT");
  const roomPort = readPort(env.MULTIPLAYER_ROOM_PORT, 3101, "MULTIPLAYER_ROOM_PORT");
  if (webPort === roomPort) throw new Error("The application and friends room need different loopback ports.");
  const publicPort = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (loopback && (publicPort === webPort || publicPort === roomPort)) {
    throw new Error("Use a separate public port for the loopback reverse proxy.");
  }
  return { origin: url.origin, webPort, roomPort };
}
