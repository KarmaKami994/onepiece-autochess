import type { CombatFxEvent } from "../components/PhaserBoard";

export const MUSIC_TRACKS = [
  { id: "harbor", name: "Harbor at Dawn", path: "/assets/audio/harbor.wav" },
  { id: "pursuit", name: "Grand Line Pursuit", path: "/assets/audio/pursuit.wav" },
] as const;
export type AudioSettings = {
  muted: boolean; volume: number; musicVolume: number; effectsVolume: number;
  musicTrack: (typeof MUSIC_TRACKS)[number]["id"];
};
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { muted: false, volume: 0.5, musicVolume: 0.35, effectsVolume: 1, musicTrack: "harbor" };

export function normalizeAudioSettings(value: Partial<AudioSettings>): AudioSettings {
  const volume = (key: "volume" | "musicVolume" | "effectsVolume") => typeof value[key] === "number" && Number.isFinite(value[key]) ? Math.max(0, Math.min(1, value[key])) : DEFAULT_AUDIO_SETTINGS[key];
  return {
    muted: value.muted === true, volume: volume("volume"), musicVolume: volume("musicVolume"), effectsVolume: volume("effectsVolume"),
    musicTrack: MUSIC_TRACKS.find((track) => track.id === value.musicTrack)?.id ?? DEFAULT_AUDIO_SETTINGS.musicTrack,
  };
}

export type SoundName = "click" | "coin" | "error" | "battle" | "reward" | "splash" | "unlock" | "cast" | "hit" | "drain" | "displace" | "transform" | "revive";
export function combatSound(event: CombatFxEvent): SoundName | null {
  if (event.kind === "cast") return "cast";
  if (event.kind === "transform") return "transform";
  if (event.kind === "resurrect") return "revive";
  if (event.kind === "displace") return "displace";
  if (event.kind === "energy" && (event.energyDelta ?? 0) < 0 && event.reason !== "cast-reset") return "drain";
  if (event.kind === "damage" && (event.amount ?? 0) > 0) return "hit";
  return null;
}
