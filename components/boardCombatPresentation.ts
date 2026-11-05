export type CombatPresentationStyle =
  | "fire"
  | "smoke"
  | "heal"
  | "lightning"
  | "slash"
  | "impact";

const SEQUENTIAL_HIT_GAP_MS = 120;

export function sequentialAbilityHitDelayMs(hitIndex: number): number {
  return Math.max(0, Math.floor(hitIndex) - 1) * SEQUENTIAL_HIT_GAP_MS;
}

export function combatPresentationStyle(
  contentId: string,
  eventKind: "attack" | "cast",
  formId?: string,
): CombatPresentationStyle {
  if (eventKind === "attack") {
    return ["ace", "sabo", "usopp"].includes(contentId) ? "fire" : "slash";
  }
  if (formId === "luffy-gear-4-boundman" || formId === "chopper-monster-point") return "impact";
  if (formId === "luffy-gear-4-snakeman" || formId === "robin-demonio-fleur") return "slash";
  if (contentId === "nami") return "lightning";
  if (["ace", "sabo", "sanji"].includes(contentId)) return "fire";
  if (["smoker", "crocodile"].includes(contentId)) return "smoke";
  if (contentId === "chopper") return "heal";
  if (["zoro", "tashigi", "mihawk", "law", "doflamingo"].includes(contentId)) {
    return "slash";
  }
  return "impact";
}

export function movementCue(kind?: string): { label: string; color: number } {
  switch (kind) {
    case "lunge": return { label: "LUNGE", color: 0xffd45a };
    case "pull": return { label: "PULL", color: 0xc5a1ff };
    case "knockback": return { label: "KNOCKBACK", color: 0xffad70 };
    case "escape": return { label: "ESCAPE", color: 0x9de2d8 };
    default: return { label: "MOVE", color: 0xffffff };
  }
}

export function formAccent(formId?: string): number {
  switch (formId) {
    case "robin-demonio-fleur": return 0xd8a1ff;
    case "luffy-gear-4-boundman": return 0xff846f;
    case "luffy-gear-4-snakeman": return 0xa9f3ff;
    case "chopper-monster-point": return 0xffd075;
    default: return 0xffffff;
  }
}
