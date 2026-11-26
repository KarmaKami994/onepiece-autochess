"use client";

import { Client, type Room } from "@colyseus/sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionToast, MatchScreen } from "../screens/GameScreens";
import { DEFAULT_SETTINGS, loadStoredSettings } from "../gameSettings";
import {
  LOCAL_MATCH_PATH,
  LOCAL_MATCH_ROOM,
  readMatchView,
  type LocalMatchCommand,
  type LocalMatchSnapshot,
} from "./protocol";
import "../game.css";

const seatKey = "grand-line-auto-chess.mp1-seat";

export default function LocalMatchClient() {
  const router = useRouter();
  const roomRef = useRef<Room | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [connection, setConnection] = useState<"loading" | "idle" | "connecting" | "connected" | "reconnecting" | "closed">("loading");
  const [snapshot, setSnapshot] = useState<LocalMatchSnapshot | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scoutedId, setScoutedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    let joined: Room | null = null;
    const token = sessionStorage.getItem(seatKey);

    async function connect() {
      const client = new Client(`${window.location.origin}${LOCAL_MATCH_PATH}`);
      setConnection(token ? "reconnecting" : "connecting");
      setSettings(loadStoredSettings());
      try {
        let room: Room;
        if (token) {
          try {
            room = await client.reconnect(token);
          } catch {
            sessionStorage.removeItem(seatKey);
            if (disposed) return;
            room = await client.join(LOCAL_MATCH_ROOM);
          }
        } else {
          room = await client.join(LOCAL_MATCH_ROOM);
        }
        if (disposed) {
          await room.leave();
          return;
        }
        joined = room;
        roomRef.current = room;
        const sync = () => {
          sessionStorage.setItem(seatKey, room.reconnectionToken);
          setConnection("connected");
          room.send("sync");
        };
        room.onMessage<LocalMatchSnapshot>("snapshot", (next) => {
          const receivedAt = performance.now();
          setNow(receivedAt);
          if (next.status === "playing") setDeadline(receivedAt + next.remainingMs);
          setSnapshot(next);
        });
        room.onMessage<string>("command-error", setError);
        room.onDrop(() => { if (!disposed) setConnection("reconnecting"); });
        room.onReconnect(() => { if (!disposed) sync(); });
        room.onLeave(() => {
          if (disposed) return;
          roomRef.current = null;
          sessionStorage.removeItem(seatKey);
          setConnection("closed");
        });
        sync();
      } catch {
        if (!disposed) {
          setConnection("closed");
          setError("The local room is full or unavailable. Try again after both captains leave.");
        }
      }
    }

    const start = window.setTimeout(() => {
      if (token || attempt > 0) void connect();
      else setConnection("idle");
    }, 0);
    return () => {
      disposed = true;
      window.clearTimeout(start);
      if (joined && roomRef.current === joined) {
        roomRef.current = null;
        void joined.leave(false);
      }
    };
  }, [attempt]);

  const playing = snapshot?.status === "playing" ? snapshot : null;
  const view = useMemo(() => playing ? readMatchView(playing.view) : null, [playing]);
  const clockRunning = playing !== null;
  useEffect(() => {
    if (!clockRunning) return;
    const interval = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(interval);
  }, [clockRunning]);

  const send = useCallback((command: LocalMatchCommand) => {
    if (connection !== "connected" || view?.phase !== "preparation" || !roomRef.current) return false;
    setError("");
    roomRef.current.send("command", command);
    return true;
  }, [connection, view?.phase]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey ||
        (event.target instanceof HTMLElement && event.target.closest("button, a, input, select, textarea, [contenteditable]"))) return;
      const key = event.key.toLowerCase();
      let command: LocalMatchCommand | undefined;
      if (/^[1-6]$/.test(key)) command = { type: "BUY_UNIT", shopIndex: Number(key) - 1 };
      if (key === "r") command = { type: "REROLL_SHOP" };
      if (key === "x") command = { type: "BUY_XP" };
      if (key === "l") command = { type: "TOGGLE_SHOP_LOCK" };
      if (key === "s" && !scoutedId && selectedId) command = { type: "SELL_UNIT", unitId: selectedId };
      if (key === "enter" && playing && !playing.ready) command = { type: "END_PREPARATION" };
      if (command && send(command)) event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playing, scoutedId, selectedId, send]);

  const leave = () => {
    sessionStorage.removeItem(seatKey);
    const room = roomRef.current;
    roomRef.current = null;
    if (room) void room.leave();
    router.push("/");
  };
  const scout = (playerId: string | null) => {
    setSelectedId(null);
    setScoutedId(playerId);
  };
  const scouted = view?.phase === "preparation" ? view.standings.find((standing) =>
    standing.id === scoutedId && !standing.isHuman) ?? null : null;
  const selectedUnit = (scouted?.boardUnits ?? view?.boardUnits)?.find((unit) => unit.id === selectedId);
  const selectedDefinition = selectedUnit && (scouted?.selectedDefinitionByUnit ?? view?.selectedDefinitionByUnit)?.get(selectedUnit.id);
  const captain = view?.standings.find((standing) => standing.isHuman)?.name;

  return (
    <main className={`game-shell ${settings.highContrast ? "high-contrast" : ""} ${settings.reducedMotion ? "reduced-motion" : ""}`}
      aria-label={captain ? `${captain}'s local match` : "Local multiplayer"}>
      {view && playing && (connection === "connected" || connection === "reconnecting") ? (
        <MatchScreen
          hidden={false}
          view={view}
          timer={Math.ceil(Math.max(0, deadline - now) / 1_000)}
          phaseDuration={Math.ceil(playing.durationMs / 1_000)}
          clockLabel={view.phaseLabel}
          clockPaused={false}
          manualPaused={false}
          settings={settings}
          selectedUnit={selectedUnit}
          selectedDefinition={selectedDefinition}
          scoutedStanding={scouted}
          battlePresentation={null}
          tutorialStep={null}
          saveStatus="idle"
          isAdvancing={false}
          online={{ ready: playing.ready, connected: connection === "connected", onLeave: leave }}
          onSelectUnit={setSelectedId}
          onScoutPlayer={scout}
          onReturnFromScout={() => scout(null)}
          onMoveUnit={(move) => {
            if (scouted) return false;
            if (move.zone === "bench" && move.slot !== undefined) {
              return send({ type: "MOVE_UNIT", unitId: move.unitId, to: { zone: "bench", slot: move.slot } });
            }
            return move.zone === "board" && move.x !== undefined && move.y !== undefined &&
              send({ type: "MOVE_UNIT", unitId: move.unitId, to: { zone: "board", x: move.x, y: move.y } });
          }}
          onBuyUnit={(shopIndex) => send({ type: "BUY_UNIT", shopIndex })}
          onReroll={() => send({ type: "REROLL_SHOP" })}
          onToggleLock={() => send({ type: "TOGGLE_SHOP_LOCK" })}
          onBuyXp={() => send({ type: "BUY_XP" })}
          onSellUnit={(unitId) => !scouted && send({ type: "SELL_UNIT", unitId })}
          onEquipItem={(itemId) => { if (!scouted && selectedId) send({ type: "EQUIP_ITEM", unitId: selectedId, itemId }); }}
          onServeFood={(foodId) => { if (!scouted && selectedId) send({ type: "USE_FOOD", unitId: selectedId, foodId }); }}
          onChangeSettings={setSettings}
          onAdvance={() => send({ type: "END_PREPARATION" })}
        />
      ) : (
        <section className="overlay-screen">
          <div className="modal-panel">
            <h1>{snapshot?.status === "complete" ? "LOCAL ROUND COMPLETE" : "LOCAL MULTIPLAYER"}</h1>
            <p role="status">
              {connection === "loading" ? "Preparing the local room…" :
                connection === "closed" ? "Connection closed." :
                snapshot?.status === "complete" ? "The round has finished. Return to the menu to leave your seat." :
                connection === "connecting" || connection === "reconnecting" ? "Connecting to the local room…" :
                snapshot?.status === "waiting" ? `Captain ${snapshot.captain} · Waiting for the other captain.` :
                "Two captains and six bots. Join from a separate browser window or profile."}
            </p>
            {error && <p role="alert">{error}</p>}
            {(connection === "idle" || connection === "closed") &&
              <button type="button" className="pixel-button primary" onClick={() => { setError(""); setAttempt(attempt + 1); }}>
                JOIN LOCAL MATCH
              </button>}
            <button type="button" className="pixel-button compact" disabled={connection === "loading"} onClick={leave}>BACK TO MENU</button>
          </div>
        </section>
      )}
      {view && error && (connection === "connected" || connection === "reconnecting") &&
        <ActionToast toast={{ id: 1, kind: "error", title: "ACTION UNAVAILABLE", message: error }}
          onClose={() => setError("")} />}
    </main>
  );
}
