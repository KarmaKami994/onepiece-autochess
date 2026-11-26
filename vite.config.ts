import vinext from "vinext";
import { defineConfig } from "vite";
import { LOCAL_MATCH_PATH } from "./app/multiplayer/protocol";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig(() => {
  const matchPort = process.env.MP1_LOCAL_SERVER_PORT;
  return {
    server: {
      watch: isCodexSeatbeltSandbox ? { useFsEvents: false, usePolling: true } : undefined,
      strictPort: matchPort ? true : undefined,
      proxy: matchPort ? {
        [`^${LOCAL_MATCH_PATH}/`]: {
          target: `http://127.0.0.1:${matchPort}`,
          ws: true,
          rewrite: (path) => path.slice(LOCAL_MATCH_PATH.length),
        },
      } : undefined,
    },
    plugins: [vinext()],
  };
});
