import type { CSSProperties } from "react";

export default function PhaseClockDisplay({ timer, duration, label }: { timer: number; duration: number; label: string }) {
  const warning = timer > 0 && timer <= 8 && ["PREPARE", "BATTLE", "RECRUITMENT"].includes(label);
  return <div className={`phase-clock ${warning ? "is-warning" : ""}`}
    role="timer" aria-live="off" aria-label={`${label}, ${timer} seconds remaining`} data-clock-label={label}>
    <span>{label}</span>
    <strong>{timer.toString().padStart(2, "0")}</strong>
    <i style={{ "--timer": Math.max(0, timer) / Math.max(1, duration) } as CSSProperties} />
  </div>;
}
