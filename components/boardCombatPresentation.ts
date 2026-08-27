export type CombatPresentationStyle =
  | "fire"
  | "smoke"
  | "heal"
  | "lightning"
  | "slash"
  | "impact";

export function combatPresentationStyle(
  contentId: string,
  eventKind: "attack" | "cast",
): CombatPresentationStyle {
  if (eventKind === "attack") {
    return ["ace", "sabo", "usopp"].includes(contentId) ? "fire" : "slash";
  }
  if (contentId === "nami") return "lightning";
  if (["ace", "sabo", "sanji"].includes(contentId)) return "fire";
  if (["smoker", "crocodile"].includes(contentId)) return "smoke";
  if (contentId === "chopper") return "heal";
  if (["zoro", "tashigi", "mihawk", "law", "doflamingo"].includes(contentId)) {
    return "slash";
  }
  return "impact";
}
