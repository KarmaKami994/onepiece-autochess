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

type MenuIconName = "compass" | "book-open" | "users" | "arrow-right" | "chevron-right" | "settings";

function MenuIcon({ name, className }: { name: MenuIconName; className?: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <use href={`/assets/ui/abendhafen-icons.svg#${name}`} />
    </svg>
  );
}

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
              <MenuIcon name="compass" className="menu-voyage-icon" />
              <span className="menu-voyage-label">
                <strong>NEW VOYAGE</strong>
                {!saveReady && <small>Reading ship&apos;s log…</small>}
              </span>
              <MenuIcon name="arrow-right" className="menu-voyage-arrow" />
            </button>
            <button type="button" className="menu-voyage" disabled={!hasSave} onClick={onContinue}>
              <MenuIcon name="book-open" className="menu-voyage-icon" />
              <span className="menu-voyage-label">
                <strong>CONTINUE</strong>
                {continueDetail && <small>{continueDetail}</small>}
              </span>
              <MenuIcon name="chevron-right" className="menu-voyage-arrow" />
            </button>
            {multiplayer && (
              <Link href="/multiplayer" className="menu-voyage">
                <MenuIcon name="users" className="menu-voyage-icon" />
                <span className="menu-voyage-label">
                  <strong>{multiplayer === "friends" ? "FRIENDS MULTIPLAYER" : "LOCAL MULTIPLAYER"}</strong>
                  {multiplayer === "friends" && <small>Private lobby · 2–8 players</small>}
                </span>
                <MenuIcon name="chevron-right" className="menu-voyage-arrow" />
              </Link>
            )}
          </div>
          <div className="menu-tools">
            <button type="button" disabled={!saveReady} onClick={onCrewTools}>CREW TOOLS</button>
            <button type="button" disabled={!saveReady} onClick={onChronicle}>VOYAGE CHRONICLE</button>
            <button type="button" disabled={!saveReady} onClick={onAnimationLab}>ANIMATION LAB</button>
            <button type="button" className="menu-settings" aria-label="SETTINGS" onClick={onSettings}>
              <MenuIcon name="settings" />
            </button>
          </div>
        </nav>
      </div>

      <footer className="menu-attribution">Unofficial One Piece fan project. Franchise rights remain with their respective owners.</footer>
      <HarborBackdrop reducedMotion={reducedMotion || !saveReady} />
    </section>
  );
}
