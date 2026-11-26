"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { GAME_CONFIG } from "../../game/content";
import type { LocalMatchSnapshot } from "./protocol";
import "./friends.css";

export function FriendsFrame({ title, children, onBack, highContrast }: {
  title: string;
  children: ReactNode;
  onBack?: () => void;
  highContrast?: boolean;
}) {
  return (
    <main className={`friends-shell${highContrast ? " friends-high-contrast" : ""}`} aria-label="Friends multiplayer">
      <header className="friends-topbar">
        <div className="friends-brand">
          <span className="friends-brand-mark" aria-hidden="true" />
          Grand Line Auto Chess
        </div>
        {onBack ? (
          <button type="button" className="friends-back" onClick={onBack}>Back to menu</button>
        ) : (
          <Link className="friends-back" href="/">Back to menu</Link>
        )}
      </header>
      <section className="friends-panel" aria-labelledby="friends-heading">
        <div className="friends-harbor" aria-hidden="true" />
        <div className="friends-content">
          <h1 id="friends-heading">{title}</h1>
          {children}
        </div>
      </section>
    </main>
  );
}

export function FriendsLobbyScreen({ lobby, error, onLeave, onStart, highContrast }: {
  lobby: Extract<LocalMatchSnapshot, { status: "lobby" }>;
  error: string;
  onLeave: () => void;
  onStart: () => void;
  highContrast: boolean;
}) {
  const inviteInput = useRef<HTMLInputElement>(null);
  const [copyFeedback, setCopyFeedback] = useState("");
  const capacity = GAME_CONFIG.playerCount;
  const canStart = lobby.captains.length >= 2;
  const invite = new URL("/multiplayer", window.location.origin);
  invite.searchParams.set("lobby", lobby.code);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(invite.href);
      setCopyFeedback("Invite link copied.");
    } catch {
      inviteInput.current?.focus();
      inviteInput.current?.select();
      setCopyFeedback("Link selected. Copy it with your keyboard or browser menu.");
    }
  }

  return (
    <FriendsFrame title="Private lobby" onBack={onLeave} highContrast={highContrast}>
      <section className="friends-roster" aria-labelledby="friends-roster-heading">
        <div className="friends-section-heading">
          <h2 id="friends-roster-heading">Crew</h2>
          <p aria-live="polite">{lobby.captains.length} / {capacity} connected</p>
        </div>
        <ul className="friends-seats" aria-label="Captains">
          {Array.from({ length: capacity }, (_, index) => {
            const name = lobby.captains[index];
            return (
              <li className={name ? "friends-seat" : "friends-seat friends-seat-open"} key={index}>
                <span className="friends-seat-mark" aria-hidden="true">{name ? [...name][0].toUpperCase() : "+"}</span>
                <span>{name ?? "Open seat"}</span>
              </li>
            );
          })}
        </ul>
      </section>
      {lobby.host && (
        <div className="friends-invite">
          <label htmlFor="friends-invite-link">Lobby link</label>
          <div className="friends-invite-row">
            <input id="friends-invite-link" ref={inviteInput} type="url" readOnly value={invite.href} />
            <button type="button" className="friends-button friends-button-secondary" onClick={copyInvite}>Copy link</button>
          </div>
          <p className="friends-copy-feedback" role="status">{copyFeedback || "Share this link with an approved captain."}</p>
        </div>
      )}
      {error && <p className="friends-error" role="alert">{error}</p>}
      <div className="friends-departure">
        <p id="friends-start-note">
          {lobby.host
            ? canStart ? "Bots fill any open seats." : "Invite one more captain to start. Bots fill any open seats."
            : "Waiting for the host to start. Bots fill any open seats."}
        </p>
        {lobby.host && (
          <button type="button" className="friends-button" aria-describedby="friends-start-note"
            disabled={!canStart} onClick={onStart}>Start match</button>
        )}
      </div>
    </FriendsFrame>
  );
}
