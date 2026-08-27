import { useCallback, useRef } from "react";

export type SoundName =
  | "click"
  | "coin"
  | "error"
  | "battle"
  | "reward"
  | "splash"
  | "unlock";

export function useGameAudio(settings: { muted: boolean; volume: number }) {
  const contextRef = useRef<AudioContext | null>(null);
  return useCallback(
    (sound: SoundName) => {
      if (settings.muted || settings.volume <= 0 || typeof window === "undefined") {
        return;
      }
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = contextRef.current ?? new AudioContextClass();
      contextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const config: Record<SoundName, [number, number, OscillatorType]> = {
        click: [280, 0.055, "square"],
        coin: [620, 0.11, "triangle"],
        error: [130, 0.16, "sawtooth"],
        battle: [190, 0.2, "square"],
        reward: [760, 0.25, "triangle"],
        splash: [210, 0.08, "triangle"],
        unlock: [520, 0.16, "square"],
      };
      const [frequency, duration, type] = config[sound];
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      const endFrequency =
        sound === "reward" ? 1120
          : sound === "battle" ? 90
            : sound === "splash" ? 120
              : sound === "unlock" ? 820
                : null;
      if (endFrequency !== null) {
        oscillator.frequency.exponentialRampToValueAtTime(
          endFrequency,
          now + duration,
        );
      }
      gain.gain.setValueAtTime(settings.volume * 0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    },
    [settings.muted, settings.volume],
  );
}
