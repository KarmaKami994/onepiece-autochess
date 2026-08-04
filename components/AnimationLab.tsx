"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  CREW_ANIMATION_MANIFEST,
  getCrewAnimationDefinitions,
  type CrewAnimationDefinition,
  type CrewAnimationState,
} from "./crewAnimationManifest";

const PREVIEW_SIZE = 256;
const STATES: CrewAnimationState[] = [
  "idle",
  "move",
  "attack",
  "cast",
  "hit",
  "defeat",
];

function frameAtTime(
  definition: CrewAnimationDefinition,
  state: CrewAnimationState,
  elapsedMs: number,
) {
  const clip = definition.clips[state];
  const frameCount = clip.end - clip.start + 1;
  const offset = Math.floor((elapsedMs * clip.frameRate) / 1_000) % frameCount;
  return clip.start + offset;
}

function spriteStyle(
  definition: CrewAnimationDefinition,
  frame: number,
  facing: "player" | "enemy",
  isComparison: boolean,
): CSSProperties {
  const columns = definition.sheetColumns ?? definition.frameCount;
  const rows = Math.ceil(definition.frameCount / columns);
  const column = frame % columns;
  const row = Math.floor(frame / columns);
  const originX = definition.originX ?? 0.5;
  const originY = definition.originY ?? 116 / 128;
  const previewScale = isComparison
    ? definition.version === "v2"
      ? 1.1
      : 0.68
    : 1;
  return {
    position: "absolute",
    left: "50%",
    bottom: 58 - (1 - originY) * PREVIEW_SIZE,
    marginLeft: -originX * PREVIEW_SIZE,
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    backgroundImage: `url(${definition.sheetPath})`,
    backgroundPosition: `${-column * PREVIEW_SIZE}px ${-row * PREVIEW_SIZE}px`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${columns * PREVIEW_SIZE}px ${rows * PREVIEW_SIZE}px`,
    imageRendering: "pixelated",
    transform: `${facing === "enemy" ? "scaleX(-1) " : ""}scale(${previewScale})`,
    transformOrigin: `${originX * 100}% ${originY * 100}%`,
  };
}

export default function AnimationLab({ onBack }: { onBack: () => void }) {
  const rosterDefinitions = useMemo(
    () => Object.values(CREW_ANIMATION_MANIFEST),
    [],
  );
  const [contentId, setContentId] = useState<string>(
    rosterDefinitions[0]?.contentId ?? "",
  );
  const [state, setState] = useState<CrewAnimationState>("idle");
  const [facing, setFacing] = useState<"player" | "enemy">("player");
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const definitions = useMemo(
    () => getCrewAnimationDefinitions(contentId),
    [contentId],
  );
  const primaryDefinition = definitions.at(-1);
  const primaryClip = primaryDefinition?.clips[state];

  useEffect(() => {
    if (!playing || !primaryClip) return;
    const interval = window.setInterval(() => {
      setElapsedMs((current) => current + 50 * speed);
    }, 50);
    return () => window.clearInterval(interval);
  }, [playing, primaryClip, speed]);

  if (!primaryDefinition || !primaryClip) return null;

  const stepFrame = (direction: -1 | 1) => {
    setPlaying(false);
    const frameCount = primaryClip.end - primaryClip.start + 1;
    const frameDuration = 1_000 / primaryClip.frameRate;
    const currentOffset =
      Math.floor(elapsedMs / frameDuration) % frameCount;
    const nextOffset = (currentOffset + direction + frameCount) % frameCount;
    setElapsedMs(nextOffset * frameDuration);
  };

  return (
    <section className="animation-lab-screen" aria-labelledby="animation-lab-title">
      <header className="animation-lab-header">
        <div>
          <span className="eyebrow">LOCAL ASSET TOOL</span>
          <h1 id="animation-lab-title">ANIMATION LAB</h1>
          <p>Compare runtime variants on the same timeline and pivot.</p>
        </div>
        <button type="button" className="pixel-button compact" onClick={onBack}>
          ← TITLE SCREEN
        </button>
      </header>

      <div className="animation-lab-layout">
        <aside className="animation-lab-controls" aria-label="Animation controls">
          <label>
            <span>CHARACTER</span>
            <select
              value={contentId}
              onChange={(event) => {
                setContentId(event.target.value);
                setElapsedMs(0);
              }}
            >
              {rosterDefinitions.map((candidate) => (
                <option key={candidate.contentId} value={candidate.contentId}>
                  {candidate.contentId.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend>STATE</legend>
            <div className="animation-state-grid">
              {STATES.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  className={candidate === state ? "is-active" : ""}
                  aria-pressed={candidate === state}
                  onClick={() => {
                    setState(candidate);
                    setElapsedMs(0);
                  }}
                >
                  {candidate.toUpperCase()}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>FACING</legend>
            <div className="animation-toggle-pair">
              <button
                type="button"
                className={facing === "player" ? "is-active" : ""}
                aria-pressed={facing === "player"}
                onClick={() => setFacing("player")}
              >
                PLAYER →
              </button>
              <button
                type="button"
                className={facing === "enemy" ? "is-active" : ""}
                aria-pressed={facing === "enemy"}
                onClick={() => setFacing("enemy")}
              >
                ← ENEMY
              </button>
            </div>
          </fieldset>

          <label>
            <span>PLAYBACK SPEED</span>
            <select
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2×</option>
            </select>
          </label>

          <div className="animation-transport" aria-label="Frame controls">
            <button type="button" onClick={() => stepFrame(-1)} aria-label="Previous frame">
              ◀
            </button>
            <button type="button" onClick={() => setPlaying((current) => !current)}>
              {playing ? "PAUSE" : "PLAY"}
            </button>
            <button type="button" onClick={() => stepFrame(1)} aria-label="Next frame">
              ▶
            </button>
          </div>
        </aside>

        <div
          className={`animation-preview-grid ${definitions.length > 1 ? "is-comparison" : ""}`}
        >
          {definitions.map((definition) => {
            const clip = definition.clips[state];
            const frame = frameAtTime(definition, state, elapsedMs);
            return (
              <article
                className="animation-preview-panel"
                key={definition.assetKey}
                aria-label={`${definition.contentId} ${definition.version} preview`}
              >
                <div className="animation-preview-stage">
                  <div className="animation-deck-grid" aria-hidden="true" />
                  <div
                    className="animation-preview-sprite"
                    style={spriteStyle(
                      definition,
                      frame,
                      facing,
                      definitions.length > 1,
                    )}
                    role="img"
                    aria-label={`${definition.contentId} ${definition.version} ${state} animation, frame ${frame}`}
                  />
                  <span className="animation-baseline" aria-hidden="true" />
                  <span className={`animation-version-badge is-${definition.version}`}>
                    {definition.version.toUpperCase()}
                  </span>
                </div>
                <div className="animation-frame-readout" aria-live="polite">
                  <span>{definition.contentId.toUpperCase()} · {definition.version.toUpperCase()}</span>
                  <strong>{state.toUpperCase()}</strong>
                  <span>FRAME {frame} / {definition.frameCount - 1}</span>
                  <span>{clip.frameRate} FPS · {definition.frameWidth}²</span>
                </div>
                <p className="animation-asset-path">{definition.sheetPath}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
