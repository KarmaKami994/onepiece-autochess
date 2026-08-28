"use client";

import {
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import PhaserBoard, {
  type BoardMove,
  type BoardUnit,
} from "@/components/PhaserBoard";
import PhaserCarousel, {
  type CarouselPresentationSnapshot,
  type CarouselTokenView,
} from "@/components/PhaserCarousel";
import { DEFAULT_BOUNTY_ITEM_ORDER } from "@/components/carouselGeometry";
import { BOARD_MAP_LIST, type BoardSkin } from "@/components/boardMapManifest";
import type { TutorialStep } from "../useTutorial";
import {
  createItemView,
  cssColor,
  slugify,
  titleCase,
  type CarouselSessionView,
  type ChoiceView,
  type MatchView,
  type ShopUnitView,
  type StandingView,
  type TraitView,
} from "../selectors";

export type Settings = {
  muted: boolean;
  volume: number;
  animationSpeed: number;
  particles: boolean;
  combatNumbers: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  boardSkin: BoardSkin;
};

export type ToastView = {
  id: number;
  kind: "success" | "error" | "info";
  title: string;
  message: string;
};

export function MainMenu({
  hasSave,
  saveReady,
  saveDate,
  onNew,
  onContinue,
  onSettings,
  onAnimationLab,
}: {
  hasSave: boolean;
  saveReady: boolean;
  saveDate: number | null;
  onNew: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onAnimationLab: () => void;
}) {
  return (
    <section className="menu-screen">
      <div className="menu-cloud cloud-one" aria-hidden="true" />
      <div className="menu-cloud cloud-two" aria-hidden="true" />
      <div className="menu-island" aria-hidden="true">
        <span className="island-palm" />
      </div>
      <header className="title-lockup">
        <span className="title-kicker">A LOCAL AUTO-BATTLER</span>
        <div className="title-emblem" aria-hidden="true">
          <span className="emblem-wheel">✦</span>
        </div>
        <h1>
          <span>GRAND LINE</span>
          <strong>AUTO CHESS</strong>
        </h1>
        <p>Build a crew. Read the tides. Become King of the Pirates.</p>
      </header>
      <nav className="menu-actions" aria-label="Main menu">
        <button
          type="button"
          className="pixel-button primary"
          disabled={!saveReady}
          onClick={onNew}
        >
          <span className="button-icon">☠</span>
          NEW VOYAGE
          <small>
            {saveReady ? "Start with a fresh Log Pose" : "Reading ship's log…"}
          </small>
        </button>
        <button
          type="button"
          className="pixel-button"
          disabled={!hasSave}
          onClick={onContinue}
        >
          <span className="button-icon">➜</span>
          CONTINUE
          <small>
            {hasSave && saveDate
              ? `Ship's log · ${new Date(saveDate).toLocaleDateString()}`
              : "No voyage in the ship's log"}
          </small>
        </button>
        <button type="button" className="pixel-button compact" onClick={onSettings}>
          <span className="button-icon">⚙</span>
          SETTINGS
        </button>
        <button type="button" className="pixel-button compact" onClick={onAnimationLab}>
          <span className="button-icon">▦</span>
          ANIMATION LAB
        </button>
      </nav>
      <footer className="menu-footer">
        <span>OFFLINE</span>
        <i aria-hidden="true" />
        <span>LOCAL SAVE</span>
        <i aria-hidden="true" />
        <span>v0.1 PROTOTYPE</span>
      </footer>
      <p className="fan-disclaimer">
        Unofficial private local fan prototype. Franchise rights remain with
        their respective owners. Not endorsed or affiliated.
      </p>
    </section>
  );
}
export function ConfirmNewVoyageScreen({
  onCancel,
  onReplace,
}: {
  onCancel: () => void;
  onReplace: () => void;
}) {
  return (
    <section className="overlay-screen">
      <div
        className="modal-panel confirm-new-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-new-title"
      >
        <div className="rope-heading">
          <span aria-hidden="true">⚠</span>
          <div>
            <p>SHIP&apos;S LOG</p>
            <h2 id="confirm-new-title">REPLACE SAVED VOYAGE?</h2>
          </div>
        </div>
        <p className="warning-copy">
          Starting over will replace the current local voyage as soon as the
          new crew is created. Settings and guide progress stay intact.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="pixel-button compact"
            onClick={onCancel}
            autoFocus
          >
            KEEP CURRENT LOG
          </button>
          <button
            type="button"
            className="pixel-button compact primary"
            onClick={onReplace}
          >
            START NEW VOYAGE
          </button>
        </div>
      </div>
    </section>
  );
}

export function ActionToast({
  toast,
  onClose,
}: {
  toast: ToastView;
  onClose: () => void;
}) {
  return (
    <aside
      className={`action-toast ${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live={toast.kind === "error" ? "assertive" : "polite"}
    >
      <span aria-hidden="true">
        {toast.kind === "error" ? "!" : toast.kind === "success" ? "✓" : "◆"}
      </span>
      <div>
        <strong>{toast.title}</strong>
        <p>{toast.message}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss message">
        ×
      </button>
    </aside>
  );
}

export function TutorialCoach({
  step,
  onBegin,
  onSkip,
}: {
  step: TutorialStep;
  onBegin: () => void;
  onSkip: () => void;
}) {
  const lessons: Record<
    TutorialStep,
    {
      eyebrow: string;
      title: string;
      copy: string;
      hint: string;
      legend?: Array<{ icon: string; text: string }>;
    }
  > = {
    welcome: {
      eyebrow: "FIRST VOYAGE · 1 MINUTE",
      title: "WELCOME ABOARD, CAPTAIN",
      copy: "Learn the dock, deck, and treasure flow before the clock begins.",
      hint: "Preparation pauses while a guide card is open.",
    },
    recruit: {
      eyebrow: "STEP 1 OF 6 · RECRUIT",
      title: "CHOOSE YOUR FIRST CREWMATE",
      copy: "Click any affordable wanted poster in the Recruitment Dock.",
      hint: "Gold costs are shown in the lower-right of each card.",
    },
    deploy: {
      eyebrow: "STEP 2 OF 6 · FORMATION",
      title: "MOVE THEM ONTO YOUR DECK",
      copy: "Select the bench unit, then click a highlighted green deck tile—or drag it there.",
      hint: "Only the lower three rows belong to your crew.",
    },
    second: {
      eyebrow: "STEP 3 OF 6 · BUILD",
      title: "FIELD A SECOND CREWMATE",
      copy: "Recruit and deploy one more fighter. Your level determines your crew capacity.",
      hint: "Matching bonds grow stronger when distinct characters are deployed.",
    },
    sail: {
      eyebrow: "STEP 4 OF 6 · READY",
      title: "START THE BATTLE",
      copy: "Your formation is ready. Use the crimson Start Battle button to begin combat.",
      hint: "Combat is automatic; your preparation decisions determine the outcome.",
    },
    "await-reward": {
      eyebrow: "STEP 5 OF 6 · COMBAT",
      title: "WATCH THE PLAN UNFOLD",
      copy: "Your crew now moves, attacks, and casts abilities automatically.",
      hint: "The first Marine wave rewards a treasure when defeated.",
      legend: [
        { icon: "♥", text: "Health" },
        { icon: "◆", text: "Energy — casts at 100" },
        { icon: "⬡", text: "Shield" },
        { icon: "🔥", text: "Burn" },
        { icon: "✦", text: "Stun / protection" },
      ],
    },
    treasure: {
      eyebrow: "STEP 5 OF 6 · TREASURE",
      title: "CLAIM ONE REWARD",
      copy: "Choose the treasure that best supports the crew you are building.",
      hint: "Every item has a complete effect description.",
    },
    equip: {
      eyebrow: "STEP 6 OF 6 · EQUIP",
      title: "ARM YOUR CREW",
      copy: "Select a crew member, then click the new treasure in the left rail.",
      hint: "Each unit can carry up to three items. Selling returns all equipped items.",
    },
  };
  const lesson = lessons[step];
  const progressStep: Record<TutorialStep, number> = {
    welcome: 0,
    recruit: 1,
    deploy: 2,
    second: 3,
    sail: 4,
    "await-reward": 5,
    treasure: 5,
    equip: 6,
  };
  const target =
    step === "recruit" || step === "second" || step === "sail"
      ? "shop"
      : step === "deploy"
        ? "board"
        : step === "equip"
          ? "inventory"
          : step === "await-reward" || step === "treasure"
            ? "reward"
            : "modal";
  const trapWelcomeFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (step !== "welcome" || event.key !== "Tab") return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      ),
    );
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className={`tutorial-coach tutorial-${step} ${
        step === "welcome" ? "is-modal" : ""
      }`}
      data-target={target}
    >
      <div className="tutorial-scrim" aria-hidden="true" />
      <aside
        className="tutorial-card"
        role={step === "welcome" ? "dialog" : "status"}
        aria-modal={step === "welcome" ? true : undefined}
        aria-labelledby="tutorial-title"
        aria-live={step === "welcome" ? undefined : "polite"}
        onKeyDown={trapWelcomeFocus}
      >
        <span
          className="tutorial-progress"
          aria-label={
            progressStep[step] === 0
              ? "First voyage introduction"
              : `First voyage step ${progressStep[step]} of 6`
          }
        >
          <b>{lesson.eyebrow}</b>
          <span className="tutorial-progress-track" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => {
              const stepNumber = index + 1;
              return (
                <i
                  key={stepNumber}
                  className={
                    stepNumber < progressStep[step]
                      ? "complete"
                      : stepNumber === progressStep[step]
                        ? "active"
                        : ""
                  }
                />
              );
            })}
          </span>
        </span>
        <h2 id="tutorial-title">{lesson.title}</h2>
        <p>{lesson.copy}</p>
        {lesson.legend && (
          <ul className="tutorial-combat-legend" aria-label="Combat symbols">
            {lesson.legend.map((entry) => (
              <li key={entry.text}>
                <span aria-hidden="true">{entry.icon}</span>
                {entry.text}
              </li>
            ))}
          </ul>
        )}
        <small>{lesson.hint}</small>
        <div className="tutorial-actions">
          <button type="button" className="text-button" onClick={onSkip}>
            Skip guide
          </button>
          {step === "welcome" && (
            <button
              type="button"
              className="pixel-button compact primary"
              onClick={onBegin}
              autoFocus
            >
              SHOW ME THE ROPES
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

export function SettingsScreen({
  settings,
  onChange,
  onBack,
  hasActiveVoyage,
  onLeaveVoyage,
  onRestartTutorial,
  onExportDiagnostics,
  onClearDiagnostics,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onBack: () => void;
  hasActiveVoyage: boolean;
  onLeaveVoyage: () => void;
  onRestartTutorial: () => void;
  onExportDiagnostics: () => void;
  onClearDiagnostics: () => void;
}) {
  return (
    <section className="overlay-screen settings-screen">
      <div className="modal-panel settings-panel">
        <div className="rope-heading">
          <span aria-hidden="true">⚙</span>
          <div>
            <p>CAPTAIN&apos;S QUARTERS</p>
            <h2>SETTINGS</h2>
          </div>
        </div>
        <div className="settings-grid">
          <label className="setting-row">
            <span>
              <strong>Master volume</strong>
              <small>Synthesized local sound effects</small>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              disabled={settings.muted}
              onChange={(event) =>
                onChange({ ...settings, volume: Number(event.target.value) })
              }
            />
            <output>{Math.round(settings.volume * 100)}%</output>
          </label>
          <SettingToggle
            label="Mute all sound"
            note="Useful when plotting in secret"
            checked={settings.muted}
            onChange={(muted) => onChange({ ...settings, muted })}
          />
          <label className="setting-row">
            <span>
              <strong>Battle speed</strong>
              <small>Controls board event animations</small>
            </span>
            <select
              value={settings.animationSpeed}
              onChange={(event) =>
                onChange({
                  ...settings,
                  animationSpeed: Number(event.target.value),
                })
              }
            >
              <option value={0.5}>Leisurely · 0.5×</option>
              <option value={1}>Normal · 1×</option>
              <option value={2}>Swift · 2×</option>
              <option value={4}>Storm speed · 4×</option>
            </select>
          </label>
          <fieldset className="map-skin-setting">
            <legend>
              <strong>Battlefield</strong>
              <small>Changes presentation only — combat rules stay identical</small>
            </legend>
            <div className="map-skin-picker">
              {BOARD_MAP_LIST.map((map) => (
                <button
                  type="button"
                  key={map.id}
                  className={settings.boardSkin === map.id ? "is-selected" : ""}
                  aria-pressed={settings.boardSkin === map.id}
                  onClick={() => onChange({ ...settings, boardSkin: map.id })}
                >
                  <span
                    className="map-skin-preview"
                    style={{ backgroundImage: `url(${map.assetPath})` }}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{map.label}</strong>
                    <small>{map.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <SettingToggle
            label="Combat particles"
            note="Sparks, splashes, and impact bursts"
            checked={settings.particles}
            onChange={(particles) => onChange({ ...settings, particles })}
          />
          <SettingToggle
            label="Combat numbers"
            note="Damage, healing, shields, critical hits, and dodges"
            checked={settings.combatNumbers}
            onChange={(combatNumbers) =>
              onChange({ ...settings, combatNumbers })
            }
          />
          <SettingToggle
            label="Reduced motion"
            note="Removes lunges, shakes, and decorative combat motion"
            checked={settings.reducedMotion}
            onChange={(reducedMotion) =>
              onChange({ ...settings, reducedMotion })
            }
          />
          <SettingToggle
            label="High contrast"
            note="Brighter borders and stronger labels"
            checked={settings.highContrast}
            onChange={(highContrast) =>
              onChange({ ...settings, highContrast })
            }
          />
        </div>
        <div className="key-map" aria-label="Keyboard shortcuts">
          <h3>QUICK ORDERS</h3>
          <span><kbd>1–6</kbd> Recruit</span>
          <span><kbd>R</kbd> Reroll</span>
          <span><kbd>L</kbd> Lock</span>
          <span><kbd>X</kbd> Buy XP</span>
          <span><kbd>Enter</kbd> Start / skip battle</span>
          <span><kbd>Esc</kbd> Menu</span>
        </div>
        <div className="modal-actions">
          <button type="button" className="text-button" onClick={onExportDiagnostics}>
            Export diagnostics
          </button>
          <button type="button" className="text-button" onClick={onClearDiagnostics}>
            Clear diagnostics
          </button>
          {hasActiveVoyage && (
            <>
              <button
                type="button"
                className="text-button"
                onClick={onRestartTutorial}
              >
                Restart first-voyage guide
              </button>
              <button type="button" className="text-button danger" onClick={onLeaveVoyage}>
                Return to title
              </button>
            </>
          )}
          <button type="button" className="pixel-button compact primary" onClick={onBack}>
            BACK TO DECK
          </button>
        </div>
      </div>
    </section>
  );
}

function SettingToggle({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="setting-row toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{note}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true"><b /></i>
    </label>
  );
}

export function MatchScreen({
  view,
  timer,
  phaseDuration,
  settings,
  selectedUnit,
  selectedDefinition,
  scoutedStanding,
  tutorialStep,
  saveStatus,
  isAdvancing,
  onSelectUnit,
  onScoutPlayer,
  onReturnFromScout,
  onMoveUnit,
  onBuyUnit,
  onReroll,
  onToggleLock,
  onBuyXp,
  onSellSelected,
  onEquipItem,
  onChangeSettings,
  onAdvance,
  onSettings,
}: {
  view: MatchView;
  timer: number;
  phaseDuration: number;
  settings: Settings;
  selectedUnit?: BoardUnit;
  selectedDefinition?: ShopUnitView;
  scoutedStanding: StandingView | null;
  tutorialStep: TutorialStep | null;
  saveStatus: "idle" | "saving" | "saved";
  isAdvancing: boolean;
  onSelectUnit: (unitId: string | null) => void;
  onScoutPlayer: (playerId: string | null) => void;
  onReturnFromScout: () => void;
  onMoveUnit: (move: BoardMove) => boolean;
  onBuyUnit: (index: number) => void;
  onReroll: () => void;
  onToggleLock: () => void;
  onBuyXp: () => void;
  onSellSelected: () => void;
  onEquipItem: (itemId: string) => void;
  onChangeSettings: (settings: Settings) => void;
  onAdvance: () => void;
  onSettings: () => void;
}) {
  const [previewShopIndex, setPreviewShopIndex] = useState<number | null>(null);
  const planning = view.phase === "preparation";
  const scouting = planning && Boolean(scoutedStanding);
  const battleEconomy = view.phase === "battle" && tutorialStep === null;
  const economyPhase = planning || battleEconomy;
  const tacticalUnits = scoutedStanding?.boardUnits ?? view.boardUnits;
  const tacticalTraits = scoutedStanding?.traits ?? view.traits;
  const tacticalCapacity = scoutedStanding?.level ?? view.capacity;
  const warning = timer <= 8;
  const playerCrewCount = view.boardUnits.filter(
    (unit) => unit.team === "player",
  ).length;
  const tutorialAllowsShop =
    tutorialStep === null ||
    tutorialStep === "recruit" ||
    (tutorialStep === "second" && playerCrewCount < 2);
  const tutorialAllowsSailing =
    tutorialStep === null || tutorialStep === "sail";
  let quickMove: BoardMove | null = null;
  if (planning && !scouting && selectedUnit?.team === "player") {
    if (selectedUnit.zone === "bench") {
      if (view.deployed < view.capacity) {
        const occupied = new Set(
          view.boardUnits
            .filter((unit) => unit.team === "player" && unit.zone === "board")
            .map((unit) => `${unit.x},${unit.y}`),
        );
        outer: for (let y = 5; y >= 3; y -= 1) {
          for (let x = 0; x < 8; x += 1) {
            if (!occupied.has(`${x},${y}`)) {
              quickMove = { unitId: selectedUnit.id, zone: "board", x, y };
              break outer;
            }
          }
        }
      }
    } else {
      const occupiedSlots = new Set(
        view.boardUnits
          .filter((unit) => unit.team === "player" && unit.zone === "bench")
          .map((unit) => unit.slot),
      );
      const slot = Array.from({ length: 8 }, (_, index) => index).find(
        (index) => !occupiedSlots.has(index),
      );
      if (slot !== undefined) {
        quickMove = { unitId: selectedUnit.id, zone: "bench", slot };
      }
    }
  }

  return (
    <section className="match-screen">
      <header className="match-topbar">
        <div className="round-medallion">
          <span>STAGE</span>
          <strong>{view.stageLabel}</strong>
        </div>
        <div className="opponent-banner">
          <span className="tiny-label">
            {scoutedStanding
              ? "SCOUTING CAPTAIN"
              : view.opponent
              ? view.phase === "battle"
                ? "ENGAGED WITH"
                : "NEXT ENCOUNTER"
              : "PAIRING"}
          </span>
          <strong>
            {scoutedStanding?.name ??
              view.opponent?.name ??
              "Pairing after preparation"}
          </strong>
          {(scoutedStanding ?? view.opponent) && (
            <span>Lv. {(scoutedStanding ?? view.opponent)?.level}</span>
          )}
        </div>
        <div
          className={`phase-clock ${warning ? "is-warning" : ""}`}
          aria-label={`${view.phaseLabel}, ${timer} seconds remaining`}
        >
          <span>
            {planning && tutorialStep ? "PAUSED" : view.phaseLabel}
          </span>
          <strong>{timer.toString().padStart(2, "0")}</strong>
          <i style={{ "--timer": `${Math.max(0, timer) / Math.max(1, phaseDuration)}` } as CSSProperties} />
        </div>
        <div className="topbar-tools">
          <span className={`save-indicator ${saveStatus}`}>
            {saveStatus === "saving" ? "WRITING LOG…" : saveStatus === "saved" ? "LOG SAVED" : "LOCAL"}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={onSettings}
            aria-label="Open settings"
            data-tooltip="Settings · Esc"
          >
            ⚙
          </button>
        </div>
      </header>

      <div
        className="match-body"
        data-board-skin={settings.boardSkin}
        data-scouting={scouting ? "true" : "false"}
      >
        <PhaserBoard
          units={tacticalUnits}
          selectedId={selectedUnit?.id ?? null}
          interactionMode={
            scouting
              ? "none"
              : planning
                ? "formation"
                : battleEconomy
                  ? "bench-only"
                  : "none"
          }
          phase={scouting ? "scouting" : view.phase}
          capacity={tacticalCapacity}
          boardSkin={settings.boardSkin}
          combatEvents={scouting ? [] : view.events}
          eventSequence={view.eventSequence}
          speed={settings.animationSpeed}
          particles={settings.particles}
          combatNumbers={settings.combatNumbers}
          reducedMotion={settings.reducedMotion}
          onMoveUnit={onMoveUnit}
          onSelectUnit={onSelectUnit}
        />
        <div className="left-rail">
          <TraitsPanel traits={tacticalTraits} />
          {scoutedStanding ? (
            <ScoutIntelPanel standing={scoutedStanding} itemsById={view.itemsById} />
          ) : (
            <InventoryTray
              items={view.inventory}
              units={view.boardUnits.filter((unit) => unit.team === "player")}
              selectedId={selectedUnit?.id ?? null}
              selectedName={selectedDefinition?.name}
              disabled={
                !planning ||
                !selectedUnit ||
                selectedUnit.items.length >= 3
              }
              help={
                !planning
                  ? "Treasure can be equipped during preparation."
                  : !selectedUnit
                    ? "Select a crew member, then click an item."
                    : selectedUnit.items.length >= 3
                      ? `${selectedDefinition?.name ?? "This unit"} already carries 3 items.`
                      : "Click an item to equip it. Max 3 per unit."
              }
              highlighted={tutorialStep === "equip"}
              onSelect={onSelectUnit}
              onEquip={onEquipItem}
            />
          )}
        </div>
        <div
          className={`board-column ${
            tutorialStep === "deploy" || tutorialStep === "second"
              ? "tutorial-focus"
              : ""
          }`}
        >
          <div className="board-ribbon">
            {scoutedStanding ? (
              <>
                <span className="active">SCOUTING</span>
                <i />
                <strong>{scoutedStanding.name}&apos;s formation</strong>
                <button
                  type="button"
                  className="return-from-scout"
                  onClick={onReturnFromScout}
                >
                  RETURN TO YOUR CREW
                </button>
              </>
            ) : (
              <>
                <span className={planning ? "active" : ""}>FORMATION</span>
                <i />
                <strong>
                  {planning
                    ? "Select or drag crew onto highlighted deck tiles"
                    : "Combat formation locked · bench remains manageable"}
                </strong>
                <i />
                <span className={!planning ? "active" : ""}>COMBAT</span>
              </>
            )}
          </div>
          {!planning && (
            <div className="combat-hud" aria-label="Combat presentation controls">
              <span className="combat-hud-label" aria-live="polite">
                AUTO COMBAT
              </span>
              <label>
                <span>SPEED</span>
                <select
                  value={settings.animationSpeed}
                  onChange={(event) =>
                    onChangeSettings({
                      ...settings,
                      animationSpeed: Number(event.target.value),
                    })
                  }
                  aria-label="Battle animation speed"
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                  <option value={4}>4×</option>
                </select>
              </label>
              <span className="combat-hud-key">
                {settings.combatNumbers ? "NUMBERS ON" : "NUMBERS OFF"}
              </span>
            </div>
          )}
        </div>
        <div className="right-rail">
          {selectedUnit && selectedDefinition && (
            <UnitInspector
              unit={selectedUnit}
              definition={selectedDefinition}
              itemsById={view.itemsById}
              canMove={planning && !scouting}
              canSell={
                !scouting &&
                (planning || (battleEconomy && selectedUnit.zone === "bench"))
              }
              allowSell={tutorialStep === null}
              quickMove={planning && !scouting ? quickMove : null}
              onClose={() => onSelectUnit(null)}
              onSell={onSellSelected}
              onMove={() => quickMove && onMoveUnit(quickMove)}
            />
          )}
          {!selectedUnit && (
            <StandingsPanel
              standings={view.standings}
              planning={planning && tutorialStep === null}
              scoutedPlayerId={scoutedStanding?.id ?? null}
              onScoutPlayer={onScoutPlayer}
            />
          )}
        </div>
      </div>

      <footer className="match-footer">
        <div className="captain-stats">
          <div className="health-orb" data-tooltip="Captain health">
            <span>♥</span>
            <strong>{view.hp}</strong>
          </div>
          <div className="level-block">
            <span>LEVEL {view.level}</span>
            <div className="xp-track">
              <i
                style={{
                  width:
                    view.level >= 9
                      ? "100%"
                      : `${Math.min(100, (view.xp / view.xpToNext) * 100)}%`,
                }}
              />
            </div>
            <small>
              {view.level >= 9 ? "MAX LEVEL" : `${view.xp} / ${view.xpToNext} XP`}
            </small>
          </div>
          <button
            type="button"
            className="economy-button"
            disabled={!economyPhase || view.level >= 9 || tutorialStep !== null}
            onClick={onBuyXp}
            data-tooltip="Buy 4 XP for 4 gold · X"
          >
            <kbd>X</kbd>
            BUY XP
            <small>4 <span className="coin-dot" /></small>
          </button>
          <div className="crew-capacity" data-tooltip="Crew deployed / maximum">
            <span>CREW</span>
            <strong className={view.deployed > view.capacity ? "over-cap" : ""}>
              {view.deployed}/{view.capacity}
            </strong>
          </div>
        </div>

        <div
          className={`shop-wrap ${
            tutorialStep === "recruit" || tutorialStep === "second"
              ? "tutorial-focus"
              : ""
          }`}
        >
          {economyPhase && previewShopIndex !== null && view.shop[previewShopIndex] && (
            <ShopDecisionPreview unit={view.shop[previewShopIndex]} />
          )}
          <div className="shop-heading">
            <span>RECRUITMENT DOCK</span>
            <small className="shop-help">
              Click or press 1–6 · Hover or focus for full details
            </small>
          </div>
          <div className="shop-row">
            {view.shop.map((unit, index) => (
              <ShopCard
                key={`${unit?.id ?? "empty"}-${index}`}
                unit={unit}
                index={index}
                disabled={
                  !economyPhase ||
                  !unit ||
                  Boolean(unit.disabledReason) ||
                  !tutorialAllowsShop
                }
                previewed={previewShopIndex === index}
                onPreview={setPreviewShopIndex}
                onBuy={() => onBuyUnit(index)}
              />
            ))}
          </div>
        </div>

        <div className="shop-controls">
          <div
            className="gold-pouch"
            data-tooltip={`Next income: ${view.economy.base} base + ${view.economy.interest} interest + ${view.economy.streak} streak`}
          >
            <span className="coin-large">●</span>
            <strong>{view.gold}</strong>
            <small>GOLD</small>
            <span className="economy-breakdown">
              +{view.economy.total} NEXT
            </span>
          </div>
          <button
            type="button"
            className="control-button"
            disabled={!economyPhase || tutorialStep !== null}
            onClick={onReroll}
            data-tooltip="Refresh all recruits for 1 gold · R"
          >
            <kbd>R</kbd>
            <span>REROLL</span>
            <small>1 ●</small>
          </button>
          <button
            type="button"
            className={`control-button ${view.shopLocked ? "is-active" : ""}`}
            disabled={!economyPhase || tutorialStep !== null}
            onClick={onToggleLock}
            data-tooltip="Keep this shop next round · L"
          >
            <kbd>L</kbd>
            <span>{view.shopLocked ? "LOCKED" : "LOCK"}</span>
            <small>{view.shopLocked ? "HELD" : "FREE"}</small>
          </button>
          <button
            type="button"
            className={`control-button sail-button ${
              tutorialStep === "sail" ? "tutorial-focus" : ""
            }`}
            disabled={
              isAdvancing ||
              (planning &&
                (!tutorialAllowsSailing ||
                  (tutorialStep === "sail" && view.deployed < 2)))
            }
            onClick={onAdvance}
            data-tooltip={planning ? "End preparation early" : "Resolve battle"}
          >
            <span>{planning ? "START BATTLE" : "SKIP ANIMATION"}</span>
            <small>{planning ? "READY!" : "RESOLVE NOW"}</small>
          </button>
        </div>
      </footer>
    </section>
  );
}

function TraitsPanel({ traits }: { traits: TraitView[] }) {
  const active = traits.filter((trait) => trait.tier > 0);
  const building = traits.filter((trait) => trait.tier === 0);
  const renderTrait = (trait: TraitView) => (
    <div
      key={trait.id}
      className={`trait-row ${trait.tier > 0 ? "active" : ""}`}
      style={{ "--trait-color": trait.color } as CSSProperties}
      tabIndex={0}
      title={trait.description}
    >
      <span className="trait-icon">{trait.icon}</span>
      <span className="trait-copy">
        <strong>{trait.name}</strong>
        <small>
          {trait.next ? `${trait.count} / ${trait.next}` : `${trait.count} · MAX`}
        </small>
      </span>
      <span className="trait-pips">
        {Array.from(
          { length: Math.max(1, Math.min(3, trait.tier + 1)) },
          (_, index) => (
            <i key={index} className={index < trait.tier ? "filled" : ""} />
          ),
        )}
      </span>
    </div>
  );

  return (
    <aside className="side-panel traits-panel" aria-label="Active crew traits">
      <div className="side-heading">
        <span>CREW BONDS</span>
        <small>{active.length} ACTIVE</small>
      </div>
      <div className="trait-list">
        {active.length === 0 && (
          <div className="empty-panel">
            <span>◇</span>
            <p>Field matching crew to activate a bond.</p>
          </div>
        )}
        {active.length > 0 && (
          <span className="trait-section-label">ACTIVE BONUSES</span>
        )}
        {active.map(renderTrait)}
        {building.length > 0 && (
          <details className="trait-building" open={active.length === 0}>
            <summary>
              BUILDING TOWARD
              <span>{building.length}</span>
            </summary>
            <div>{building.map(renderTrait)}</div>
          </details>
        )}
      </div>
      <p className="panel-tip">Duplicates count once per evolution line.</p>
    </aside>
  );
}

function ScoutIntelPanel({
  standing,
  itemsById,
}: {
  standing: StandingView;
  itemsById: Map<string, ChoiceView>;
}) {
  const equippedItemIds = standing.boardUnits.flatMap((unit) => unit.items);
  const itemCounts = new Map<string, number>();
  [...equippedItemIds, ...standing.inventory.map((item) => item.contentId)].forEach(
    (itemId) => itemCounts.set(itemId, (itemCounts.get(itemId) ?? 0) + 1),
  );
  const itemRows = [...itemCounts.entries()].map(([itemId, count]) => ({
    item: itemsById.get(itemId) ?? createItemView(itemId),
    count,
  }));

  return (
    <aside
      className="side-panel scout-intel-panel"
      aria-label={`${standing.name} captain intel`}
    >
      <div className="side-heading">
        <span>CAPTAIN INTEL</span>
        <small>READ ONLY</small>
      </div>
      <div className="scout-intel-scroll">
        <div className="scout-summary">
          <span>
            <small>LEVEL</small>
            <strong>{standing.level}</strong>
          </span>
          <span>
            <small>GOLD</small>
            <strong>{standing.gold}</strong>
          </span>
          <span>
            <small>CREW</small>
            <strong>
              {standing.boardUnits.filter((unit) => unit.zone === "board").length}/
              {standing.level}
            </strong>
          </span>
        </div>

        <section className="scout-intel-section" aria-label="Scouted treasure">
          <strong>TREASURE</strong>
          {itemRows.length ? (
            <ul className="scout-item-list">
              {itemRows.map(({ item, count }) => (
                <li key={item.id} title={item.description}>
                  <span aria-hidden="true">{item.icon}</span>
                  <b>{item.name}</b>
                  {count > 1 && <small>×{count}</small>}
                </li>
              ))}
            </ul>
          ) : (
            <p>No treasure revealed.</p>
          )}
        </section>

        <section className="scout-intel-section" aria-label="Recent battles">
          <strong>RECENT BATTLES</strong>
          {standing.recentBattles.length ? (
            <ol className="recent-battle-list">
              {standing.recentBattles.map((battle) => (
                <li
                  key={`${battle.round}-${battle.opponentId}`}
                  data-outcome={battle.outcome}
                >
                  <span>R{battle.round}</span>
                  <b>
                    {battle.opponentName}
                    {battle.isGhost ? " · GHOST" : ""}
                  </b>
                  <small>
                    {battle.outcome.toUpperCase()}
                    {battle.captainDamageDealt > 0
                      ? ` · +${battle.captainDamageDealt}`
                      : battle.captainDamageTaken > 0
                        ? ` · -${battle.captainDamageTaken}`
                        : ""}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p>No PvP encounters recorded yet.</p>
          )}
        </section>
      </div>
    </aside>
  );
}

function StandingsPanel({
  standings,
  planning,
  scoutedPlayerId,
  onScoutPlayer,
}: {
  standings: StandingView[];
  planning: boolean;
  scoutedPlayerId: string | null;
  onScoutPlayer: (playerId: string | null) => void;
}) {
  return (
    <aside className="side-panel standings-panel" aria-label="Captain standings">
      <div className="side-heading">
        <span>CAPTAINS</span>
        <small>{standings.filter((standing) => standing.alive).length} AFLOAT</small>
      </div>
      <ol className="standings-list">
        {standings.map((standing, index) => (
          <li
            key={standing.id}
            className={`${standing.isHuman ? "is-player" : ""} ${!standing.alive ? "eliminated" : ""} ${scoutedPlayerId === standing.id ? "is-scouted" : ""}`}
          >
            <button
              type="button"
              disabled={
                !planning ||
                !standing.alive ||
                (standing.isHuman && scoutedPlayerId === null)
              }
              aria-pressed={scoutedPlayerId === standing.id}
              aria-label={
                standing.isHuman
                  ? `Return to your crew, level ${standing.level}, ${standing.hp} health`
                  : `Scout ${standing.name}, level ${standing.level}, ${standing.hp} health`
              }
              title={
                standing.crewPreview.length
                  ? standing.crewPreview
                      .map((unit) => `${unit.name} ${"★".repeat(unit.star)}`)
                      .join(" · ")
                  : "No deployed crew revealed"
              }
              onClick={() =>
                onScoutPlayer(standing.isHuman ? null : standing.id)
              }
            >
              <span className="rank">{index + 1}</span>
              <span className="captain-avatar" aria-hidden="true">
                {standing.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="captain-copy">
                <strong>{standing.isHuman ? "YOU" : standing.name}</strong>
                <small>
                  LV. {standing.level} · {standing.gold}G
                  {standing.streak > 1 ? ` · 🔥${standing.streak}` : ""}
                </small>
              </span>
              <span className="captain-health">
                <i style={{ width: `${standing.hp}%` }} />
                <b>{standing.hp}</b>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function CrewPortrait({
  src,
  name,
  color,
  className = "",
}: {
  src?: string;
  name: string;
  color: string;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = Boolean(src && failedSource === src);
  return (
    <span
      className={`crew-portrait ${className} ${failed || !src ? "fallback" : ""}`}
      style={{ "--portrait-color": color } as CSSProperties}
      aria-hidden="true"
    >
      {!failed && src ? (
        // These are local, pixel-art game sprites and should not be resized by
        // Next's photographic image pipeline.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setFailedSource(src)}
          draggable={false}
        />
      ) : (
        <b>{name.slice(0, 2).toUpperCase()}</b>
      )}
    </span>
  );
}

function ShopCard({
  unit,
  index,
  disabled,
  previewed,
  onPreview,
  onBuy,
}: {
  unit: ShopUnitView | null;
  index: number;
  disabled: boolean;
  previewed: boolean;
  onPreview: (index: number | null) => void;
  onBuy: () => void;
}) {
  if (!unit) {
    return (
      <div className="shop-card is-empty" aria-label={`Shop slot ${index + 1}, empty`}>
        <span>SAILED</span>
      </div>
    );
  }
  const activatingBond = unit.traitPreview.find(
    (trait) => trait.activatesIfFielded,
  );
  const tooltip = [
    `${unit.ability.name}: ${unit.ability.description}`,
    `Power ${unit.ability.power} · ${titleCase(unit.ability.effect)}`,
    `Owned ${unit.mergeProgress}`,
    activatingBond
      ? `Would activate ${activatingBond.name} when deployed`
      : unit.traitPreview[0]?.deltaIfFielded === 0
        ? "Duplicate — no additional bond count"
        : unit.traitPreview[0]?.next
        ? `+1 toward ${unit.traitPreview[0].name} (${unit.traitPreview[0].next}) if fielded`
        : "",
    unit.disabledReason ?? "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      className="shop-card-shell"
      role={disabled ? "group" : undefined}
      tabIndex={disabled ? 0 : -1}
      aria-label={
        disabled
          ? `${unit.name} recruitment details. ${unit.disabledReason ?? "Recruitment unavailable"}`
          : undefined
      }
      onMouseEnter={() => onPreview(index)}
      onMouseLeave={() => onPreview(null)}
      onFocus={() => onPreview(index)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onPreview(null);
      }}
    >
      <button
        type="button"
        className={`shop-card rarity-${slugify(unit.rarity)} ${
          unit.disabledReason ? "is-unaffordable" : ""
        } ${activatingBond ? "activates-bond" : ""} ${
          previewed ? "is-previewed" : ""
        }`}
        disabled={disabled}
        onClick={() => {
          onPreview(null);
          onBuy();
        }}
        aria-label={`Recruit ${unit.name} for ${unit.cost} gold. ${
          unit.disabledReason ? `${titleCase(unit.disabledReason)}. ` : ""
        }Shortcut ${index + 1}`}
        aria-describedby={`shop-card-detail-${index}`}
      >
        <span className="sr-only" id={`shop-card-detail-${index}`}>
          {tooltip}
        </span>
        <kbd>{index + 1}</kbd>
        <CrewPortrait src={unit.portrait} name={unit.name} color={unit.color} />
        <span className="shop-unit-copy">
          <strong>{unit.name}</strong>
          <small>
            {unit.traitDetails
              .map((trait) => trait.name)
              .slice(0, 2)
              .join(" · ") || unit.rarity}
          </small>
        </span>
        <span className="shop-badge-row">
          {unit.purchaseUpgrade && (
            <b className="merge-badge">
              BUY → {"★".repeat(unit.purchaseUpgrade)}
            </b>
          )}
          {!unit.purchaseUpgrade && unit.ownedCopies > 0 && (
            <b className="merge-badge">{unit.mergeProgress}</b>
          )}
          {activatingBond && (
            <b className="bond-badge">FIELD → {activatingBond.name}</b>
          )}
        </span>
        {unit.disabledReason && (
          <b className="cost-warning">{unit.disabledReason}</b>
        )}
        <span className="shop-cost">{unit.cost}<i>●</i></span>
      </button>
    </div>
  );
}

function ShopDecisionPreview({ unit }: { unit: ShopUnitView }) {
  const activatingBond = unit.traitPreview.find(
    (trait) => trait.activatesIfFielded,
  );
  return (
    <aside
      className="shop-decision-preview"
      aria-label={`${unit.name} recruitment details`}
      aria-live="polite"
    >
      <div className="shop-preview-identity">
        <CrewPortrait src={unit.portrait} name={unit.name} color={unit.color} />
        <span>
          <small>{unit.rarity} · {unit.cost} GOLD</small>
          <strong>{unit.name}</strong>
          <em>{unit.traitDetails.map((trait) => trait.name).join(" · ")}</em>
        </span>
      </div>
      <div className="shop-preview-ability">
        <small>ABILITY · {titleCase(unit.ability.effect)}</small>
        <strong>{unit.ability.name}</strong>
        <p>{unit.ability.description}</p>
      </div>
      <div className="shop-preview-impact">
        <small>RECRUITMENT IMPACT</small>
        <span className="shop-preview-stats">
          HP {unit.stats.health} · ATK {unit.stats.attack} · DEF {unit.stats.defense} · RNG {unit.stats.range}
        </span>
        <ul className="shop-preview-bonds" aria-label="Projected bond counts after fielding">
          {unit.traitPreview.slice(0, 3).map((trait) => (
            <li key={trait.id} className={trait.activatesIfFielded ? "activates" : ""}>
              {trait.name} {trait.current}→{trait.current + trait.deltaIfFielded}
              {trait.next ? ` / ${trait.next}` : ""}
            </li>
          ))}
          {unit.traitPreview.length > 3 && (
            <li>+{unit.traitPreview.length - 3} MORE</li>
          )}
        </ul>
        <strong className={unit.disabledReason ? "is-warning" : ""}>
          {unit.disabledReason
            ? unit.disabledReason
            : unit.purchaseUpgrade
              ? `IMMEDIATE MERGE → ${"★".repeat(unit.purchaseUpgrade)}`
              : activatingBond
                ? `FIELD TO ACTIVATE ${activatingBond.name.toUpperCase()}`
                : `OWNED ${unit.mergeProgress}`}
        </strong>
      </div>
    </aside>
  );
}

function InventoryTray({
  items,
  units,
  selectedId,
  selectedName,
  disabled,
  help,
  highlighted,
  onSelect,
  onEquip,
}: {
  items: ChoiceView[];
  units: BoardUnit[];
  selectedId: string | null;
  selectedName?: string;
  disabled: boolean;
  help: string;
  highlighted: boolean;
  onSelect: (unitId: string | null) => void;
  onEquip: (itemId: string) => void;
}) {
  return (
    <aside
      className={`inventory-tray panel-inventory ${
        highlighted ? "tutorial-focus" : ""
      }`}
      aria-label="Treasure inventory"
    >
      <div className="inventory-heading">
        <span>TREASURE</span>
        <small>{items.length}/8 STORED</small>
      </div>
      <label className="inventory-label">
        EQUIP TO
        <small>
          {selectedName ? selectedName : "SELECT CREW"}
        </small>
        <select
          className="crew-order-select"
          aria-label="Select crew for orders"
          value={selectedId ?? ""}
          onChange={(event) => onSelect(event.target.value || null)}
        >
          <option value="">—</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.shortName} · {unit.zone === "bench" ? "B" : "D"}
            </option>
          ))}
        </select>
      </label>
      <div
        className="inventory-slots"
        style={
          {
            "--inventory-count": Math.max(8, items.length),
          } as CSSProperties
        }
      >
        {Array.from({ length: Math.max(8, items.length) }, (_, index) => {
          const item = items[index];
          return (
            <button
              type="button"
              key={item ? `${item.id}-${index}` : `empty-${index}`}
              className={item ? "has-item" : ""}
              style={
                item
                  ? ({ "--item-color": item.color } as CSSProperties)
                  : undefined
              }
              disabled={!item || disabled}
              onClick={() => item && onEquip(item.id)}
              aria-label={
                item
                  ? `Equip ${item.name}${selectedName ? ` to ${selectedName}` : ""}`
                  : `Empty inventory slot ${index + 1}`
              }
              data-tooltip={
                item
                  ? `${item.name}: ${item.description}${
                      item.effects.length
                        ? ` · ${item.effects.map((effect) => effect.label).join(" · ")}`
                        : ""
                    }${disabled ? " · Select an eligible unit" : ""}`
                  : "Empty treasure slot"
              }
              title={
                item
                  ? `${item.name}: ${item.description}`
                  : "Empty treasure slot"
              }
            >
              {item?.icon ?? ""}
            </button>
          );
        })}
      </div>
      <p className="inventory-help">
        {help}
      </p>
    </aside>
  );
}

function UnitInspector({
  unit,
  definition,
  itemsById,
  canMove,
  canSell,
  allowSell,
  quickMove,
  onClose,
  onSell,
  onMove,
}: {
  unit: BoardUnit;
  definition: ShopUnitView;
  itemsById: Map<string, ChoiceView>;
  canMove: boolean;
  canSell: boolean;
  allowSell: boolean;
  quickMove: BoardMove | null;
  onClose: () => void;
  onSell: () => void;
  onMove: () => void;
}) {
  const starScale = unit.star >= 3 ? 3.24 : unit.star === 2 ? 1.8 : 1;
  const abilityScale = unit.star >= 3 ? 2.25 : unit.star === 2 ? 1.5 : 1;
  const equippedItems = unit.items
    .map((itemId) => itemsById.get(itemId))
    .filter((item): item is ChoiceView => Boolean(item));
  const itemEffects = equippedItems.flatMap((item) => item.effects);
  const effectTotal = (kind: string) =>
    itemEffects
      .filter((effect) => effect.kind === kind)
      .reduce((total, effect) => total + effect.value, 0);
  const health = Math.max(
    Math.round(definition.stats.health * starScale) +
      effectTotal("health-flat"),
    Math.round(unit.maxHp),
  );
  const attack =
    Math.round(definition.stats.attack * starScale) +
    effectTotal("attack-flat");
  const defense =
    Math.round(definition.stats.defense * starScale) +
    effectTotal("defense-flat");
  const range = definition.stats.range + effectTotal("range-flat");
  const attacksPerSecond =
    (1_000 / definition.stats.attackIntervalMs) *
    (1 + effectTotal("attack-speed-percent") / 100);
  const abilityPower = Math.round(
    definition.ability.power *
      abilityScale *
      (1 + effectTotal("ability-power-percent") / 100),
  );

  return (
    <aside
      className="unit-inspector inspector-panel side-panel"
      aria-label={`${definition.name} details`}
    >
      <div className="inspector-heading">
        <span>CREW DETAILS</span>
        <button
          type="button"
          className="close-inspector"
          onClick={onClose}
          aria-label="Return to captain standings"
        >
          ×
        </button>
      </div>
      <div className="inspector-scroll">
        <div className="inspector-header">
          <CrewPortrait
            src={definition.portrait}
            name={definition.name}
            color={definition.color}
            className="inspector-portrait"
          />
          <div>
            <span className="unit-stars">{"★".repeat(unit.star)}</span>
            <strong>{definition.name}</strong>
            <small>
              {definition.traitDetails
                .map((trait) => trait.name)
                .join(" · ")}
            </small>
          </div>
        </div>

        <div className="inspector-stat-grid" aria-label="Combat stats">
          {[
            ["HP", `${Math.max(0, Math.round(unit.hp))}/${health}`],
            ["ATK", attack],
            ["DEF", defense],
            ["RANGE", range],
            ["SPEED", `${attacksPerSecond.toFixed(2)}/s`],
            ["POWER", abilityPower],
          ].map(([label, value]) => (
            <span className="inspector-stat" key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </span>
          ))}
        </div>
        <small className="stat-note">
          Star and item values shown; active bond modifiers apply in combat.
        </small>

        <div className="ability-card">
          <span>{titleCase(definition.ability.effect)} technique</span>
          <strong>{definition.ability.name}</strong>
          <p>{definition.ability.description}</p>
          <small>CAST POWER · {abilityPower}</small>
        </div>

        {unit.team === "player" && (
          <div className="merge-progress">
            <span>EVOLUTION LINE</span>
            <strong>{definition.mergeProgress}</strong>
            <small>{definition.ownedCopies} equivalent copies owned</small>
          </div>
        )}

        <div className="equipped-items">
          <span>EQUIPPED TREASURE · {equippedItems.length}/3</span>
          {Array.from({ length: 3 }, (_, index) => {
            const item = equippedItems[index];
            return item ? (
              <div className="equipped-item" key={`${item.id}-${index}`}>
                <b aria-hidden="true">{item.icon}</b>
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.effects.map((effect) => effect.label).join(" · ") ||
                      item.description}
                  </small>
                </span>
              </div>
            ) : (
              <div className="equipped-item empty-item" key={`empty-${index}`}>
                <b aria-hidden="true">◇</b>
                <span>Empty item slot</span>
              </div>
            );
          })}
        </div>
      </div>
      {(canMove || canSell) && (
        <div className="inspector-actions">
          {canMove && (
            <button
              type="button"
              className="move-unit-button"
              disabled={!quickMove}
              onClick={onMove}
            >
              {unit.zone === "bench" ? "DEPLOY" : "TO BENCH"}
            </button>
          )}
          {canSell && (
            <>
              <button
                type="button"
                className="sell-button"
                onClick={onSell}
                disabled={!allowSell}
                title={
                  allowSell
                    ? "Sell this unit and return its equipped treasure"
                    : "Selling unlocks after the first-voyage guide"
                }
              >
                SELL ·{" "}
                {Math.max(
                  1,
                  definition.cost *
                    (unit.star >= 3 ? 9 : unit.star === 2 ? 3 : 1),
                )}{" "}
                ●
              </button>
              <small>Selling returns all equipped treasure.</small>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

export function CarouselScreen({
  choices,
  session,
  playerId,
  round,
  settings,
  onSetTarget,
  onAutoPick,
  onSettings,
}: {
  choices: ChoiceView[];
  session: CarouselSessionView | null;
  playerId: string;
  round: number;
  settings: Settings;
  onSetTarget: (target: { x: number; y: number }) => void;
  onAutoPick: () => void;
  onSettings: () => void;
}) {
  const [rendererFailed, setRendererFailed] = useState(false);
  const [previewChoiceId, setPreviewChoiceId] = useState(
    choices.find((choice) => !choice.takenByPlayerId)?.id ?? "",
  );
  const previewChoice =
    choices.find((choice) => choice.id === previewChoiceId) ??
    choices.find((choice) => !choice.takenByPlayerId) ??
    choices[0];
  const playerBoat = session?.participants.find(
    (participant) => participant.playerId === playerId,
  );
  const remainingTicks = Math.max(
    0,
    (session?.durationTicks ?? 0) - (session?.tick ?? 0),
  );
  const remainingSeconds = Math.ceil(remainingTicks * 0.05);
  const releaseSeconds = playerBoat
    ? Math.max(0, Math.ceil((playerBoat.releaseTick - (session?.tick ?? 0)) * 0.05))
    : 0;
  const status = playerBoat?.claimedChoiceId
    ? "BOUNTY SECURED"
    : releaseSeconds > 0
      ? `ANCHOR LOCKED · ${releaseSeconds}`
      : "SAIL NOW";
  const itemColumns: Map<string, number> = new Map(
    DEFAULT_BOUNTY_ITEM_ORDER.map((itemId, index) => [
      itemId,
      index,
    ]),
  );
  const tokens: CarouselTokenView[] = choices.map((choice, index) => ({
    id: choice.id,
    itemId: choice.contentId,
    contentId: choice.contentId,
    name: choice.name,
    description: choice.description,
    icon: choice.icon,
    color: choice.color,
    orbitIndex: choice.orbitIndex ?? index,
    claimedAtTick: choice.claimedAtTick ?? null,
    takenByPlayerId: choice.takenByPlayerId ?? null,
    itemColumn: itemColumns.get(choice.contentId) ?? index % 8,
  } satisfies CarouselTokenView));
  const snapshot: CarouselPresentationSnapshot | null = session
    ? {
        tick: session.tick,
        durationTicks: session.durationTicks,
        finishAtTick: session.finishAtTick,
        participants: session.participants,
        choices: tokens,
        events: session.events,
      }
    : null;
  const recommendedChoiceId = choices.find(
    (choice) => choice.decision?.recommended && !choice.takenByPlayerId,
  )?.id;
  return (
    <section className="choice-screen carousel-screen bounty-regatta-screen">
      <header className="regatta-hud">
        <div className="regatta-title">
          <span className="eyebrow">ROUND {round} · LOWEST HEALTH SAILS FIRST</span>
          <h2>BOUNTY REGATTA</h2>
          <p>Click the sea to steer. Touch a floating bounty to claim it.</p>
        </div>
        <div className="regatta-status" aria-live="polite">
          <span>YOUR SHIP</span>
          <strong className={releaseSeconds > 0 ? "is-locked" : ""}>{status}</strong>
          <small>RANK #{playerBoat?.rank ?? "–"}</small>
        </div>
        <div className={`carousel-timer ${remainingSeconds <= 3 ? "is-warning" : ""}`}>
          <span>AUTO PICK IN</span>
          <strong>{remainingSeconds}</strong>
        </div>
        <button
          type="button"
          className="regatta-settings"
          onClick={onSettings}
          aria-label="Open settings and pause the Bounty Regatta"
        >
          SETTINGS
        </button>
      </header>
      <div className="regatta-stage" aria-label="Player-controlled boat arena">
        {snapshot && !rendererFailed ? (
          <PhaserCarousel
            snapshot={snapshot}
            playerId={playerId}
            tickMs={50}
            reducedMotion={settings.reducedMotion}
            highContrast={settings.highContrast}
            recommendedChoiceId={recommendedChoiceId}
            onSetTarget={onSetTarget}
            onHoverChoice={(choiceId) => setPreviewChoiceId(choiceId ?? "")}
            onFailure={() => setRendererFailed(true)}
            onFallbackAutoPick={onAutoPick}
          />
        ) : (
          <div className="regatta-fallback" role="alert">
            <span aria-hidden="true">⚓</span>
            <strong>THE CURRENT CANNOT BE CHARTED</strong>
            <p>Your Log Pose can still secure the best remaining bounty.</p>
            <button type="button" onClick={onAutoPick}>AUTO-PICK BEST FIT</button>
          </div>
        )}
        <div
          className="regatta-preview"
          id="carousel-choice-preview"
          aria-live="polite"
        >
          <span style={{ color: previewChoice?.color }}>{previewChoice?.icon ?? "☠"}</span>
          <strong>{previewChoice?.name ?? "TRACK A BOUNTY"}</strong>
          <small>{previewChoice?.description ?? "Hover a bounty for details."}</small>
          {previewChoice && previewChoice.effects.length > 0 && (
            <em>
              {previewChoice.effects.map((effect) => effect.label).join(" · ")}
            </em>
          )}
          {previewChoice?.decision && (
            <b className="carousel-fit-copy">
              {previewChoice.decision.recommended ? "LOG POSE FAVORITE" : "CREW FIT"}
              {previewChoice.decision.bestFit
                ? ` · ${previewChoice.decision.bestFit.unitName}`
                : " · KEEP FOR LATER"}
            </b>
          )}
          {previewChoice?.takenByPlayerId && (
            <b className="regatta-claimed">CLAIMED BY A RIVAL</b>
          )}
        </div>
      </div>
      <footer className="regatta-help">
        <span><b>LEFT CLICK</b> SET SAILING TARGET</span>
        <span><b>TOUCH</b> CLAIM BOUNTY</span>
        <span><b>TIMEOUT</b> BEST FIT</span>
      </footer>
    </section>
  );
}

export function RewardScreen({
  choices,
  onChoose,
}: {
  choices: ChoiceView[];
  onChoose: (id: string) => void;
}) {
  return (
    <section className="choice-screen reward-screen">
      <div className="reward-rays" aria-hidden="true" />
      <header className="choice-heading">
        <span className="eyebrow">PVE ENCOUNTER CLEARED</span>
        <h2>CLAIM YOUR TREASURE</h2>
        <p>The defeated crew left three prizes behind. Take one for the voyage.</p>
      </header>
      <div className="reward-cards">
        {choices.map((choice, index) => (
          <button
            type="button"
            className="reward-card"
            key={choice.id}
            style={{ "--choice-color": choice.color } as CSSProperties}
            onClick={() => onChoose(choice.id)}
            aria-label={`Take treasure: ${choice.name}. Shortcut ${index + 1}`}
          >
            <span className="reward-number">0{index + 1}</span>
            <kbd>{index + 1}</kbd>
            <span className="treasure-icon">{choice.icon}</span>
            <strong>{choice.name}</strong>
            <p>{choice.description}</p>
            {choice.effects.length > 0 && (
              <small className="reward-effects">
                {choice.effects.map((effect) => effect.label).join(" · ")}
              </small>
            )}
            {choice.decision?.bestFit && (
              <small className="reward-fit">
                {choice.decision.recommended ? "BEST CREW FIT" : "BEST ON"} · {choice.decision.bestFit.unitName}
              </small>
            )}
            <span className="choose-label">TAKE TREASURE</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function ResultsScreen({
  view,
  onNew,
  onMenu,
}: {
  view: MatchView;
  onNew: () => void;
  onMenu: () => void;
}) {
  const won = view.placement === 1;
  const activeTraits = view.traits.filter((trait) => trait.tier > 0);
  return (
    <section className={`results-screen ${won ? "victory" : ""}`}>
      <div className="results-panel">
        <span className="results-kicker">{won ? "THE GRAND LINE BOWS TO YOU" : "THE VOYAGE ENDS"}</span>
        <div className="placement-medal">
          <span>PLACEMENT</span>
          <strong>#{view.placement}</strong>
        </div>
        <h2>{won ? "PIRATE KING!" : "A LEGEND IN THE MAKING"}</h2>
        <p>
          {won
            ? "Your crew weathered every storm and claimed the final sea."
            : `${view.winnerName} claimed this sea. Rebuild, adapt, and sail again.`}
        </p>
        <div className="result-stats">
          <div><span>ROUNDS</span><strong>{view.round}</strong></div>
          <div><span>FINAL LEVEL</span><strong>{view.level}</strong></div>
          <div><span>CREW SIZE</span><strong>{view.resultCrew.length}</strong></div>
          <div>
            <span>ITEMS HELD</span>
            <strong>
              {view.resultCrew.reduce((count, unit) => count + unit.items.length, 0)}
            </strong>
          </div>
        </div>
        {activeTraits.length > 0 && (
          <div className="results-traits" aria-label="Active final crew bonds">
            <span>ACTIVE BONDS</span>
            <ul>
              {activeTraits.map((trait) => (
                <li key={trait.id} style={{ "--trait-color": trait.color } as CSSProperties}>
                  <i aria-hidden="true">{trait.icon}</i>
                  <strong>{trait.name}</strong>
                  <small>{trait.count}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="final-crew" aria-label="Final crew composition">
          {view.resultCrew
            .slice(0, 8)
            .map((unit) => {
              const definition = view.selectedDefinitionByUnit.get(unit.id);
              const itemNames = unit.items.map(
                (itemId) => view.itemsById.get(itemId)?.name ?? titleCase(itemId),
              );
              return (
                <article
                  key={unit.id}
                  className="final-crew-card"
                  aria-label={`${unit.name}, ${unit.star} star${unit.star === 1 ? "" : "s"}${
                    itemNames.length ? `, items: ${itemNames.join(", ")}` : ", no items"
                  }`}
                >
                  <CrewPortrait
                    src={definition?.portrait}
                    name={unit.name}
                    color={definition?.color ?? cssColor(unit.contentId)}
                  />
                  <span>
                    <strong>{unit.name}</strong>
                    <b aria-label={`${unit.star} stars`}>{"★".repeat(unit.star)}</b>
                    <small>{itemNames.join(" · ") || "NO TREASURE"}</small>
                  </span>
                </article>
              );
            })}
        </div>
        <div className="results-actions">
          <button type="button" className="pixel-button primary compact" onClick={onNew}>
            NEW VOYAGE
          </button>
          <button type="button" className="pixel-button compact" onClick={onMenu}>
            TITLE SCREEN
          </button>
        </div>
      </div>
    </section>
  );
}
