"use client";

import { createAuthClient } from "better-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import LocalMatchClient, { type FriendsJoin } from "./LocalMatchClient";
import { LOCAL_MATCH_PATH } from "./protocol";
import "../game.css";

const authClient = createAuthClient();

export default function FriendsEntry() {
  const [status, setStatus] = useState<"loading" | "guest" | "approved" | "error">("loading");
  const [code, setCode] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [join, setJoin] = useState<FriendsJoin>();
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${LOCAL_MATCH_PATH}/friends/session`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("The friends room is unavailable.");
        const session: { approved: boolean } = await response.json();
        if (controller.signal.aborted) return;
        const query = new URLSearchParams(window.location.search);
        const invite = query.get("lobby");
        const savedName = sessionStorage.getItem("grand-line-auto-chess.friends-name") ?? "";
        setCode(invite);
        setName(savedName);
        setStatus(session.approved ? "approved" : "guest");
        if (query.has("authError")) setError("Google sign-in could not open the friends room. Check with the host.");
        if (session.approved && invite && sessionStorage.getItem("grand-line-auto-chess.friends-lobby") === invite) {
          setJoin({ code: invite, name: savedName, create: false });
        }
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, []);

  if (join) return <LocalMatchClient friends={join} />;

  const signIn = async () => {
    setError("");
    setSigningIn(true);
    const callback = new URL("/multiplayer", window.location.origin);
    if (code) callback.searchParams.set("lobby", code);
    const failure = new URL(callback);
    failure.searchParams.set("authError", "1");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: callback.href,
        errorCallbackURL: failure.href,
      });
      if (result.error) setError("Google sign-in could not start.");
    } catch {
      setError("Google sign-in could not start.");
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <main className="game-shell" aria-label="Friends multiplayer">
      <section className="overlay-screen">
        <div className="modal-panel">
          <h1>FRIENDS MULTIPLAYER</h1>
          {status === "loading" && <p role="status">Checking access…</p>}
          {status === "error" && <p role="alert">The friends room is unavailable.</p>}
          {status === "guest" && (
            <button type="button" className="pixel-button primary" disabled={signingIn} onClick={signIn}>
              Sign in with Google
            </button>
          )}
          {status === "approved" && (
            <form onSubmit={(event) => {
              event.preventDefault();
              const nickname = name.trim();
              if (!nickname) return;
              sessionStorage.setItem("grand-line-auto-chess.friends-name", nickname);
              setJoin({ code, name: nickname, create: !code });
            }}>
              <label>
                Captain name
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={24} required />
              </label>
              <button type="submit" className="pixel-button primary" disabled={!name.trim()}>
                {code ? "Join private lobby" : "Create private lobby"}
              </button>
            </form>
          )}
          {error && <p role="alert">{error}</p>}
          {status === "approved" && <button type="button" className="pixel-button compact" onClick={async () => {
            const result = await authClient.signOut().catch(() => null);
            if (!result || result.error) { setError("Sign-out failed. Please try again."); return; }
            sessionStorage.removeItem("grand-line-auto-chess.friends-lobby");
            setStatus("guest");
          }}>Sign out</button>}
          <Link href="/" className="pixel-button compact">Back to menu</Link>
        </div>
      </section>
    </main>
  );
}
