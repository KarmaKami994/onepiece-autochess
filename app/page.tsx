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
  const multiplayer = process.env.MP1_LOCAL_SERVER_PORT
    ? (process.env.MP2_FRIENDS_ENABLED === "1" ? "friends" : "local")
    : undefined;
  return <GameClient multiplayer={multiplayer} />;
}
