import type { Metadata } from "next";
import GameClient from "./GameClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Grand Line Auto Chess" },
  description:
    "A local-only, deterministic One Piece fan auto-battler prototype.",
  other: {
    "codex-preview": "local-game",
  },
};

export default function Home() {
  return <GameClient localMultiplayer={Boolean(process.env.MP1_LOCAL_SERVER_PORT)} />;
}
