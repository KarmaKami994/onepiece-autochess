import { DEFAULT_BOARD_SKIN, isBoardSkin } from "../components/boardMapManifest";
import { DEFAULT_AUDIO_SETTINGS, normalizeAudioSettings } from "./audioSettings";
import type { Settings } from "./screens/GameScreens";

export const SETTINGS_KEY = "grand-line-auto-chess.settings.v1";
const COMBAT_SPEEDS = [0.5, 1, 2, 4] as const;
export const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_AUDIO_SETTINGS,
  animationSpeed: 1,
  autoContinueBattle: true,
  particles: true,
  combatNumbers: true,
  reducedMotion: false,
  highContrast: false,
  boardSkin: DEFAULT_BOARD_SKIN,
};

export function loadStoredSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(stored) as Partial<Settings> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      ...normalizeAudioSettings(parsed),
      autoContinueBattle: typeof parsed.autoContinueBattle === "boolean" ? parsed.autoContinueBattle : true,
      animationSpeed: COMBAT_SPEEDS.includes(
        parsed.animationSpeed as (typeof COMBAT_SPEEDS)[number],
      )
        ? parsed.animationSpeed!
        : DEFAULT_SETTINGS.animationSpeed,
      boardSkin: isBoardSkin(parsed.boardSkin)
        ? parsed.boardSkin
        : DEFAULT_BOARD_SKIN,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
