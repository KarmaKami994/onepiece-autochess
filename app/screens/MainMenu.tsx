"use client";

import Link from "next/link";
import HarborBackdrop from "./HarborBackdrop";
import "./main-menu.css";

export type MenuMultiplayer = "friends" | "local";

type MainMenuProps = {
  hasSave: boolean;
  saveReady: boolean;
  saveDate: number | null;
  reducedMotion: boolean;
  multiplayer?: MenuMultiplayer;
  onNew: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onAnimationLab: () => void;
  onCrewTools: () => void;
  onChronicle: () => void;
};

export default function MainMenu({
  hasSave,
  saveReady,
  saveDate,
  reducedMotion,
  multiplayer,
  onNew,
  onContinue,
  onSettings,
  onAnimationLab,
  onCrewTools,
  onChronicle,
}: MainMenuProps) {
  let continueDetail: string | undefined;
  if (hasSave && saveDate !== null) {
    continueDetail = `Ship's log · ${new Date(saveDate).toLocaleDateString()}`;
  } else if (!hasSave && saveReady) {
    continueDetail = "No saved voyage";
  }

  return (
    <section className="menu-screen">
      <div className="menu-content">
        <h1 className="menu-title">Grand Line <span>Auto Chess</span></h1>
        <nav className="menu-actions" aria-label="Main menu">
          <div className="menu-voyages">
            <button type="button" className="menu-voyage menu-voyage-primary" disabled={!saveReady} onClick={onNew}>
              <span className="menu-voyage-icon" aria-hidden="true">✧</span>
              <strong>NEW VOYAGE</strong>
              <small>{saveReady ? "Solo voyage" : "Reading ship's log…"}</small>
            </button>
            <button type="button" className="menu-voyage" disabled={!hasSave} onClick={onContinue}>
              <span className="menu-voyage-icon" aria-hidden="true">➜</span>
              <strong>CONTINUE</strong>
              {continueDetail && <small>{continueDetail}</small>}
            </button>
            {multiplayer && (
              <Link href="/multiplayer" className="menu-voyage">
                <span className="menu-voyage-icon" aria-hidden="true">⚓</span>
                <strong>{multiplayer === "friends" ? "FRIENDS MULTIPLAYER" : "LOCAL MULTIPLAYER"}</strong>
                {multiplayer === "friends" && <small>2–8 players</small>}
              </Link>
            )}
          </div>
          <div className="menu-tools">
            <button type="button" disabled={!saveReady} onClick={onCrewTools}>CREW TOOLS</button>
            <button type="button" disabled={!saveReady} onClick={onChronicle}>VOYAGE CHRONICLE</button>
            <button type="button" disabled={!saveReady} onClick={onAnimationLab}>ANIMATION LAB</button>
            <button type="button" onClick={onSettings}>SETTINGS</button>
          </div>
        </nav>
      </div>

      <footer className="menu-attribution">Unofficial One Piece fan project. Franchise rights remain with their respective owners.</footer>
      <HarborBackdrop reducedMotion={reducedMotion || !saveReady} />
    </section>
  );
}
