import { backupFriendsDatabase, DEFAULT_FRIENDS_VOYAGE_DB } from "../server/friendsVoyageStore";

const [destination, source = process.env.MULTIPLAYER_VOYAGE_DB ?? DEFAULT_FRIENDS_VOYAGE_DB] = process.argv.slice(2);

if (!destination) {
  console.error("Usage: npm run multiplayer:backup -- <new backup file> [source database]");
  process.exitCode = 1;
} else {
  void backupFriendsDatabase(source, destination).then(() => {
    console.log("SQLite backup created at " + destination);
  }).catch((error: unknown) => {
    const exists = error && typeof error === "object" && "code" in error && error.code === "EEXIST";
    console.error(exists ? "Choose a new backup file. The destination already exists." : "SQLite backup failed. Check the source database and destination permissions.");
    process.exitCode = 1;
  });
}
