import { notFound } from "next/navigation";
import LocalMatchClient from "./LocalMatchClient";
import FriendsEntry from "./FriendsEntry";

export const dynamic = "force-dynamic";

export default function MultiplayerPage() {
  if (!process.env.MP1_LOCAL_SERVER_PORT) notFound();
  return process.env.MP2_FRIENDS_ENABLED === "1" ? <FriendsEntry /> : <LocalMatchClient />;
}
