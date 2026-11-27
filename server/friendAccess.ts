import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { getMigrations } from "better-auth/db/migration";

export type FriendSession = { accountId: string; sessionId: string };
export type AuthorizeFriend = (headers: Headers) => Promise<FriendSession | null>;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function verifiedGoogleIdentity(profile: {
  email?: unknown; email_verified?: unknown; hd?: unknown; sub?: unknown;
}): { email: string; subject: string } | null {
  if (profile.email_verified !== true || typeof profile.email !== "string" ||
      typeof profile.sub !== "string" || !profile.sub) return null;
  const email = normalizeEmail(profile.email);
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  if (parts[1] !== "gmail.com" && (typeof profile.hd !== "string" ||
      profile.hd.toLowerCase() !== parts[1])) return null;
  return { email, subject: profile.sub };
}

export function createFriendAllowlist(db: DatabaseSync, readAddresses: () => unknown) {
  db.exec("CREATE TABLE IF NOT EXISTS friend_binding (email TEXT PRIMARY KEY, subject TEXT UNIQUE NOT NULL)");
  const byEmail = db.prepare("SELECT subject FROM friend_binding WHERE email = ?");
  const insert = db.prepare("INSERT OR IGNORE INTO friend_binding (email, subject) VALUES (?, ?)");

  function listed(email: string): boolean {
    try {
      const addresses = readAddresses();
      return Array.isArray(addresses) && addresses.every((item) => typeof item === "string") &&
        addresses.some((item: string) => normalizeEmail(item) === email);
    } catch {
      return false;
    }
  }

  return {
    bind(email: string, subject: string): boolean {
      email = normalizeEmail(email);
      if (!listed(email)) return false;
      insert.run(email, subject);
      return byEmail.get(email)?.subject === subject;
    },
    allows(email: string, subject: string): boolean {
      email = normalizeEmail(email);
      return listed(email) && byEmail.get(email)?.subject === subject;
    },
  };
}

export async function openFriendAccess(origin: string) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BETTER_AUTH_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !BETTER_AUTH_SECRET || BETTER_AUTH_SECRET.length < 32) {
    throw new Error("Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and a private BETTER_AUTH_SECRET of at least 32 characters for dev:friends.");
  }
  const databasePath = process.env.MULTIPLAYER_AUTH_DB ?? ".codex-local/multiplayer-auth.sqlite";
  const allowlistPath = process.env.MULTIPLAYER_FRIENDS_FILE ?? ".codex-local/multiplayer-friends.json";
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  try {
    if (typeof db.prepare("SELECT 1").columns !== "function") {
      throw new Error("Google sign-in requires Node.js 22.16 or later for the SQLite adapter.");
    }
    const allowlist = createFriendAllowlist(db, () => JSON.parse(readFileSync(allowlistPath, "utf8").replace(/^\uFEFF/, "")) as unknown);
    const auth = betterAuth({
      baseURL: origin,
      secret: BETTER_AUTH_SECRET,
      database: db,
      trustedOrigins: [origin],
      advanced: { useSecureCookies: new URL(origin).protocol === "https:" },
      account: { accountLinking: { enabled: false }, updateAccountOnSignIn: false },
      socialProviders: {
        google: {
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          mapProfileToUser(profile) {
            const identity = verifiedGoogleIdentity(profile);
            if (!identity || !allowlist.bind(identity.email, identity.subject)) {
              throw new APIError("FORBIDDEN", { message: "This Google account is not on the friends list." });
            }
            return { image: undefined };
          },
        },
      },
    });
    const migrations = await getMigrations(auth.options);
    await migrations.runMigrations();
    const googleAccount = db.prepare('SELECT "accountId" FROM account WHERE "userId" = ? AND "providerId" = \'google\'');
    const authorize: AuthorizeFriend = async (headers) => {
      const session = await auth.api.getSession({
        headers,
        query: { disableCookieCache: true, disableRefresh: true },
      });
      if (!session?.user.emailVerified) return null;
      const subject = googleAccount.get(session.user.id)?.accountId;
      if (typeof subject !== "string" || !allowlist.allows(session.user.email, subject)) return null;
      return { accountId: session.user.id, sessionId: session.session.id };
    };
    return { auth, authorize, close: () => db.close() };
  } catch (error) {
    db.close();
    throw error;
  }
}
