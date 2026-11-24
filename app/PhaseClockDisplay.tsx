export default function PhaseClockDisplay({ timer, duration, label }: { timer: number; duration: number; label: string }) {
  const warning = timer > 0 && timer <= 8 && ["PREPARE", "BATTLE", "RECRUITMENT", "FIRST CREW", "HARBOR"].includes(label);
  const fill = Math.min(1, Math.max(0, timer / Math.max(1, duration)));
  return <div className={`phase-clock ${warning ? "is-warning" : ""}`}
    role="timer" aria-live="off" aria-label={`${label}, ${timer} seconds remaining`} data-clock-label={label}>
    <span className="phase-clock-label">{label}</span>
    <strong>{timer.toString().padStart(2, "0")}</strong>
    <span className="phase-clock-track" aria-hidden="true">
      <span className="phase-clock-fill" style={{ width: `${fill * 100}%` }} />
    </span>
  </div>;
}
