import type { Metadata } from "next";
import GameClient from "./GameClient";

export const metadata: Metadata = {
  title: { absolute: "Grand Line Auto Chess" },
  description:
    "A local-only, deterministic One Piece fan auto-battler prototype.",
  other: {
    "codex-preview": "local-game",
  },
};

export default function Home() {
  return <GameClient />;
}
