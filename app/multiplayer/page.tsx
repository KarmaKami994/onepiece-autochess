import { notFound } from "next/navigation";
import LocalMatchClient from "./LocalMatchClient";

export default function MultiplayerPage() {
  if (!process.env.MP1_LOCAL_SERVER_PORT) notFound();
  return <LocalMatchClient />;
}
