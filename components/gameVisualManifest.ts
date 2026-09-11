export type VisualDefinition = Readonly<{
  imagePath: string;
  fallbackGlyph: string;
  color: string;
}>;

const ITEM_IDS = [
  "black-blade", "meat-platter", "clima-tact", "sniper-goggles",
  "sea-prism-stone", "armament-wraps", "den-den-mushi", "cola-engine",
  "jolly-roger-fragment", "devil-fruit-essence", "cola-canister", "jet-dial",
  "sniper-lens", "sea-king-meat", "sea-prism-shard", "black-blade-shard",
  "armament-plate", "captains-sash", "emperors-jolly-roger",
  "specialists-log-pose", "marine-justice-coat", "marksmans-thunder-dial",
  "captains-logbook", "brawlers-rumble-emblem", "guardians-sea-prism-crest",
  "revolutionary-flame", "straw-hat-token", "swordsmans-knot",
  "devil-fruit-codex", "observation-haki-mantle", "barrier-bubble",
  "reflect-dial", "flame-flame-grimoire", "sea-prism-boots",
  "lucky-pirate-ribbon", "cola-reservoir", "energy-siphon-scope",
  "healing-bubble", "star-shield-dial", "shark-tooth-charm",
  "miracle-talisman", "efficient-bandanna", "observation-goggles",
  "armor-piercing-scope", "rush-flag", "ricochet-dial", "impact-dial",
  "jet-sash", "mystery-treasure-chest", "smoke-star-escape", "gas-mask",
  "armament-sash", "spiked-armament", "impact-proof-gauntlets",
  "phoenix-feather", "banquet-belt", "healing-dial", "guard-point-dummy",
  "reversal-band", "advanced-armament-orb", "mera-mera-ember",
  "bombardier-band", "iron-pirate-helm", "bodyguard-band",
  "nullification-bandanna",
] as const;

const ITEM_ID_SET: ReadonlySet<string> = new Set(ITEM_IDS);

export function itemVisual(itemId: string, fallbackGlyph = "◆"): VisualDefinition {
  return {
    imagePath: ITEM_ID_SET.has(itemId)
      ? `/assets/items/${itemId}.svg`
      : "",
    fallbackGlyph,
    color: "#f3c75d",
  };
}

export const TRAIT_VISUALS = {
  "straw-hat": { imagePath: "/assets/traits/straw-hat.svg", fallbackGlyph: "☀", color: "#e9bd47" },
  navy: { imagePath: "/assets/traits/navy.svg", fallbackGlyph: "⚓", color: "#74b8e8" },
  warlord: { imagePath: "/assets/traits/warlord.svg", fallbackGlyph: "♦", color: "#b56ccf" },
  supernova: { imagePath: "/assets/traits/supernova.svg", fallbackGlyph: "✷", color: "#f27c47" },
  brotherhood: { imagePath: "/assets/traits/brotherhood.svg", fallbackGlyph: "∞", color: "#da6e5c" },
  revolutionary: { imagePath: "/assets/traits/revolutionary.svg", fallbackGlyph: "⚙", color: "#e85343" },
  emperor: { imagePath: "/assets/traits/emperor.svg", fallbackGlyph: "♛", color: "#9e5bd8" },
  captain: { imagePath: "/assets/traits/captain.svg", fallbackGlyph: "★", color: "#d9a649" },
  brawler: { imagePath: "/assets/traits/brawler.svg", fallbackGlyph: "✊", color: "#d95b4a" },
  swordsman: { imagePath: "/assets/traits/swordsman.svg", fallbackGlyph: "⚔", color: "#68b18d" },
  marksman: { imagePath: "/assets/traits/marksman.svg", fallbackGlyph: "◎", color: "#e2bd4d" },
  specialist: { imagePath: "/assets/traits/specialist.svg", fallbackGlyph: "〰", color: "#62b9cf" },
  guardian: { imagePath: "/assets/traits/guardian.svg", fallbackGlyph: "⛨", color: "#668dc0" },
} as const satisfies Record<string, VisualDefinition>;

export function traitVisual(traitId: string): VisualDefinition {
  return TRAIT_VISUALS[traitId as keyof typeof TRAIT_VISUALS] ?? {
    imagePath: "",
    fallbackGlyph: "◆",
    color: "#92a3b8",
  };
}

export const STATUS_VISUALS = {
  stun: { imagePath: "/assets/status/stun.svg", fallbackGlyph: "✦", color: "#f2cf55" },
  burn: { imagePath: "/assets/status/burn.svg", fallbackGlyph: "♦", color: "#f0643f" },
  wound: { imagePath: "/assets/status/wound.svg", fallbackGlyph: "!", color: "#d84747" },
  protect: { imagePath: "/assets/status/protect.svg", fallbackGlyph: "◇", color: "#65c9c0" },
  blind: { imagePath: "/assets/status/blind.svg", fallbackGlyph: "◒", color: "#aab1c2" },
  paralysis: { imagePath: "/assets/status/paralysis.svg", fallbackGlyph: "ϟ", color: "#e9c84a" },
  "resistance-reduction": { imagePath: "/assets/status/resistance-reduction.svg", fallbackGlyph: "▽", color: "#da7455" },
  resurrecting: { imagePath: "/assets/status/resurrecting.svg", fallbackGlyph: "✹", color: "#f09a4a" },
} as const satisfies Record<string, VisualDefinition>;

export function statusVisual(statusId: string): VisualDefinition {
  return STATUS_VISUALS[statusId as keyof typeof STATUS_VISUALS] ?? {
    imagePath: "",
    fallbackGlyph: "!",
    color: "#d8dee8",
  };
}

export type FormVisualDefinition = VisualDefinition & Readonly<{
  portrait: string;
  token: string;
  overlay: string;
}>;

const formVisual = (formId: string, fallbackGlyph: string, color: string): FormVisualDefinition => ({
  imagePath: `/assets/forms/${formId}/overlay.svg`,
  overlay: `/assets/forms/${formId}/overlay.svg`,
  portrait: `/assets/forms/${formId}/portrait.svg`,
  token: `/assets/forms/${formId}/token.svg`,
  fallbackGlyph,
  color,
});

export const FORM_VISUALS = {
  "robin-demonio-fleur": formVisual("robin-demonio-fleur", "✾", "#8e45c7"),
  "luffy-gear-4-boundman": formVisual("luffy-gear-4-boundman", "✊", "#a82e38"),
  "luffy-gear-4-snakeman": formVisual("luffy-gear-4-snakeman", "↝", "#d94b3f"),
  "chopper-monster-point": formVisual("chopper-monster-point", "▲", "#8a674e"),
} as const satisfies Record<string, FormVisualDefinition>;

export function formVisualDefinition(formId: string | undefined): FormVisualDefinition | null {
  if (!formId) return null;
  return FORM_VISUALS[formId as keyof typeof FORM_VISUALS] ?? null;
}

export const P7_ITEM_IDS = ITEM_IDS;
