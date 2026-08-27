import type {
  AbilityDefinition,
  GameContent,
  ItemDefinition,
  ItemEffect,
  PlayerState,
  StarLevel,
  TraitDefinition,
  TraitTier,
  UnitDefinition,
  UnitInstance,
  UnitStats,
} from "../game/types";
import {
  playerOwnsItem,
  scoreItemEffect,
  scoreItemForPlayer,
} from "../game/scoring";

export type DecisionSupportContent = Pick<
  GameContent,
  "units" | "traits" | "items" | "config"
>;

export type ShopDisabledReason = Readonly<{
  code: "EMPTY_SHOP_SLOT" | "NOT_ENOUGH_GOLD" | "BENCH_FULL";
  message: string;
}>;

export type MergeCounts = Readonly<{
  oneStar: number;
  twoStar: number;
  threeStar: number;
  equivalentCopies: number;
}>;

export type MergeDecisionPreview = Readonly<{
  before: MergeCounts;
  afterPurchase: MergeCounts;
  purchaseMerges: boolean;
  purchaseUpgrade: 2 | 3 | null;
  progress: Readonly<{
    current: number;
    afterPurchase: number;
    required: 3 | 9;
    targetStar: 2 | 3;
    label: string;
  }>;
}>;

export type TraitPurchasePreview = Readonly<{
  id: string;
  name: string;
  category: TraitDefinition["category"];
  description: string;
  currentCount: number;
  /** The projected deployed count after buying and fielding this definition. */
  afterPurchaseCount: number;
  deltaIfFielded: 0 | 1;
  projectionRequiresFielding: boolean;
  currentTier: TraitTier | null;
  afterPurchaseTier: TraitTier | null;
  nextThreshold: number | null;
  activatesTier: boolean;
}>;

export type AvailableShopDecisionPreview = Readonly<{
  available: true;
  definitionId: string;
  name: string;
  cost: UnitDefinition["cost"];
  stats: UnitStats;
  ability: AbilityDefinition;
  traits: readonly TraitPurchasePreview[];
  merge: MergeDecisionPreview;
  affordable: boolean;
  canReceive: boolean;
  disabledReason: ShopDisabledReason | null;
}>;

export type ShopDecisionPreview =
  | AvailableShopDecisionPreview
  | Readonly<{
      available: false;
      definitionId: string | null;
      disabledReason: ShopDisabledReason;
    }>;

export type ItemFitReason = Readonly<{
  effect: ItemEffect["kind"];
  score: number;
  affinities: readonly string[];
  explanation: string;
}>;

export type UnitItemFit = Readonly<{
  unitId: string;
  definitionId: string;
  unitName: string;
  star: StarLevel;
  deployed: boolean;
  eligible: boolean;
  score: number | null;
  disabledReason: "ITEM_SLOTS_FULL" | null;
  reasons: readonly ItemFitReason[];
  explanation: string;
}>;

export type AvailableItemDecisionPreview = Readonly<{
  available: true;
  itemId: string;
  name: string;
  description: string;
  icon: string;
  effects: readonly ItemEffect[];
  /** Matches the engine's deterministic item/carousel roster score. */
  score: number;
  duplicateOwned: boolean;
  bestFit: UnitItemFit | null;
  selectedFit: UnitItemFit | null;
  explanation: string;
}>;

export type ItemDecisionPreview =
  | AvailableItemDecisionPreview
  | Readonly<{
      available: false;
      itemId: string;
      disabledReason: Readonly<{
        code: "ITEM_NOT_FOUND";
        message: string;
      }>;
    }>;

const COPIES_BY_STAR: Record<StarLevel, number> = {
  1: 1,
  2: 3,
  3: 9,
};

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function definitionMap(
  definitions: readonly UnitDefinition[],
): ReadonlyMap<string, UnitDefinition> {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

function traitMap(
  definitions: readonly TraitDefinition[],
): ReadonlyMap<string, TraitDefinition> {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

function deployedDefinitionIds(player: PlayerState): ReadonlySet<string> {
  return new Set(
    Object.values(player.board)
      .map((unitId) => player.units[unitId]?.definitionId)
      .filter((definitionId): definitionId is string => Boolean(definitionId)),
  );
}

function deployedTraitCounts(
  player: PlayerState,
  unitsById: ReadonlyMap<string, UnitDefinition>,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const definitionId of [...deployedDefinitionIds(player)].sort()) {
    const definition = unitsById.get(definitionId);
    if (!definition) continue;
    for (const traitId of definition.traits) {
      counts.set(traitId, (counts.get(traitId) ?? 0) + 1);
    }
  }
  return counts;
}

function tierAtCount(
  definition: TraitDefinition,
  count: number,
): TraitTier | null {
  return (
    [...definition.tiers]
      .sort((left, right) => left.required - right.required)
      .filter((tier) => tier.required <= count)
      .at(-1) ?? null
  );
}

function mergeCounts(
  instances: readonly UnitInstance[],
  definitionId: string,
): MergeCounts {
  const counts = { oneStar: 0, twoStar: 0, threeStar: 0 };
  for (const instance of instances) {
    if (instance.definitionId !== definitionId) continue;
    if (instance.star === 1) counts.oneStar += 1;
    else if (instance.star === 2) counts.twoStar += 1;
    else counts.threeStar += 1;
  }
  return {
    ...counts,
    equivalentCopies:
      counts.oneStar * COPIES_BY_STAR[1] +
      counts.twoStar * COPIES_BY_STAR[2] +
      counts.threeStar * COPIES_BY_STAR[3],
  };
}

function simulatePurchasedMerge(before: MergeCounts): Readonly<{
  counts: MergeCounts;
  purchaseUpgrade: 2 | 3 | null;
}> {
  let oneStar = before.oneStar + 1;
  let twoStar = before.twoStar;
  let threeStar = before.threeStar;
  const createdTwoStar = Math.floor(oneStar / 3);
  oneStar %= 3;
  twoStar += createdTwoStar;
  const createdThreeStar = Math.floor(twoStar / 3);
  twoStar %= 3;
  threeStar += createdThreeStar;
  return {
    counts: {
      oneStar,
      twoStar,
      threeStar,
      equivalentCopies: before.equivalentCopies + 1,
    },
    purchaseUpgrade: createdThreeStar > 0 ? 3 : createdTwoStar > 0 ? 2 : null,
  };
}

function mergeProgress(
  before: MergeCounts,
  afterPurchase: MergeCounts,
  purchaseUpgrade: 2 | 3 | null,
): MergeDecisionPreview["progress"] {
  const targetStar: 2 | 3 = before.twoStar > 0 ? 3 : 2;
  const required: 3 | 9 = targetStar === 3 ? 9 : 3;
  const current =
    targetStar === 3
      ? before.twoStar * 3 + before.oneStar
      : before.oneStar;
  const nextTarget: 2 | 3 = afterPurchase.twoStar > 0 ? 3 : 2;
  const after =
    nextTarget === 3
      ? afterPurchase.twoStar * 3 + afterPurchase.oneStar
      : afterPurchase.oneStar;
  const label = purchaseUpgrade
    ? `BUY → ${"★".repeat(purchaseUpgrade)}`
    : `${current} / ${required} → ${"★".repeat(targetStar)}`;
  return { current, afterPurchase: after, required, targetStar, label };
}

function shopDisabledReason(
  player: PlayerState,
  definition: UnitDefinition,
  canReceive: boolean,
): ShopDisabledReason | null {
  if (player.gold < definition.cost) {
    return { code: "NOT_ENOUGH_GOLD", message: "Not enough gold." };
  }
  if (!canReceive) {
    return {
      code: "BENCH_FULL",
      message: "The bench is full and this purchase would not combine.",
    };
  }
  return null;
}

export function buildShopDecisionPreview(
  definitionId: string | null,
  player: PlayerState,
  content: DecisionSupportContent,
): ShopDecisionPreview {
  const unitsById = definitionMap(content.units);
  const definition = definitionId ? unitsById.get(definitionId) : undefined;
  if (!definition) {
    return {
      available: false,
      definitionId,
      disabledReason: {
        code: "EMPTY_SHOP_SLOT",
        message: "That offer is empty.",
      },
    };
  }

  const instances = Object.values(player.units);
  const before = mergeCounts(instances, definition.id);
  const simulated = simulatePurchasedMerge(before);
  const hasBenchSpace = player.bench.some((unitId) => unitId === null);
  const canReceive = hasBenchSpace || before.oneStar >= 2;
  const disabledReason = shopDisabledReason(player, definition, canReceive);
  const activeDefinitionIds = deployedDefinitionIds(player);
  const counts = deployedTraitCounts(player, unitsById);
  const traitsById = traitMap(content.traits);
  const traits = definition.traits.flatMap((traitId) => {
    const trait = traitsById.get(traitId);
    if (!trait) return [];
    const currentCount = counts.get(traitId) ?? 0;
    const deltaIfFielded: 0 | 1 = activeDefinitionIds.has(definition.id)
      ? 0
      : 1;
    const afterPurchaseCount = currentCount + deltaIfFielded;
    const currentTier = tierAtCount(trait, currentCount);
    const afterPurchaseTier = tierAtCount(trait, afterPurchaseCount);
    const nextThreshold =
      [...trait.tiers]
        .sort((left, right) => left.required - right.required)
        .find((tier) => tier.required > currentCount)?.required ?? null;
    return [
      {
        id: trait.id,
        name: trait.name,
        category: trait.category,
        description: trait.description,
        currentCount,
        afterPurchaseCount,
        deltaIfFielded,
        projectionRequiresFielding: deltaIfFielded === 1,
        currentTier,
        afterPurchaseTier,
        nextThreshold,
        activatesTier:
          (afterPurchaseTier?.required ?? 0) > (currentTier?.required ?? 0),
      } satisfies TraitPurchasePreview,
    ];
  });

  return {
    available: true,
    definitionId: definition.id,
    name: definition.name,
    cost: definition.cost,
    stats: { ...definition.stats },
    ability: { ...definition.ability },
    traits,
    merge: {
      before,
      afterPurchase: simulated.counts,
      purchaseMerges: simulated.purchaseUpgrade !== null,
      purchaseUpgrade: simulated.purchaseUpgrade,
      progress: mergeProgress(
        before,
        simulated.counts,
        simulated.purchaseUpgrade,
      ),
    },
    affordable: player.gold >= definition.cost,
    canReceive,
    disabledReason,
  };
}

function effectLabel(effect: ItemEffect): string {
  switch (effect.kind) {
    case "health-flat":
      return `+${effect.value} health`;
    case "attack-flat":
      return `+${effect.value} attack`;
    case "defense-flat":
      return `+${effect.value} defense`;
    case "attack-speed-percent":
      return `+${effect.value}% attack speed`;
    case "critical-chance-percent":
      return `+${effect.value}% critical chance`;
    case "ability-power-percent":
      return `+${effect.value}% ability power`;
    case "starting-energy":
      return `+${effect.value} starting energy`;
    case "range-flat":
      return `+${effect.value} range`;
    case "omnivamp-percent":
      return `+${effect.value}% omnivamp`;
  }
}

function affinityLabel(
  affinity: string,
  traitsById: ReadonlyMap<string, TraitDefinition>,
): string {
  if (affinity === "long-range") return "long-range unit";
  return traitsById.get(affinity)?.name ?? affinity;
}

function unitIsDeployed(player: PlayerState, unitId: string): boolean {
  return Object.values(player.board).includes(unitId);
}

function buildUnitItemFit(
  item: ItemDefinition,
  instance: UnitInstance,
  definition: UnitDefinition,
  player: PlayerState,
  traitsById: ReadonlyMap<string, TraitDefinition>,
  itemCap: number,
): UnitItemFit {
  const eligible = instance.items.length < itemCap;
  const reasons = item.effects.map((effect) => {
    const scored = scoreItemEffect(effect, {
      hasTrait: (traitId) => definition.traits.includes(traitId),
      hasRanged: definition.stats.range >= 4,
    });
    const affinityText = scored.affinities
      .map((affinity) => affinityLabel(affinity, traitsById))
      .join(" + ");
    return {
      effect: effect.kind,
      score: roundScore(scored.score),
      affinities: scored.affinities,
      explanation: affinityText
        ? `${effectLabel(effect)} · boosted for ${affinityText}`
        : `${effectLabel(effect)} · universally useful`,
    } satisfies ItemFitReason;
  });
  const score = eligible
    ? roundScore(reasons.reduce((total, reason) => total + reason.score, 0))
    : null;
  const strongest = [...reasons].sort(
    (left, right) =>
      right.score - left.score || left.effect.localeCompare(right.effect),
  )[0];
  return {
    unitId: instance.id,
    definitionId: definition.id,
    unitName: definition.name,
    star: instance.star,
    deployed: unitIsDeployed(player, instance.id),
    eligible,
    score,
    disabledReason: eligible ? null : "ITEM_SLOTS_FULL",
    reasons,
    explanation: eligible
      ? `${item.name} fits ${definition.name}: ${strongest?.explanation ?? item.description}.`
      : `${definition.name} already holds the maximum of ${itemCap} items.`,
  };
}

export function buildItemDecisionPreview(
  itemId: string,
  player: PlayerState,
  content: DecisionSupportContent,
  selectedUnitId: string | null = null,
): ItemDecisionPreview {
  const item = content.items.find((candidate) => candidate.id === itemId);
  if (!item) {
    return {
      available: false,
      itemId,
      disabledReason: {
        code: "ITEM_NOT_FOUND",
        message: "That item is unavailable.",
      },
    };
  }

  const unitsById = definitionMap(content.units);
  const traitsById = traitMap(content.traits);
  const fits = Object.values(player.units).flatMap((instance) => {
    const definition = unitsById.get(instance.definitionId);
    return definition
      ? [
          buildUnitItemFit(
            item,
            instance,
            definition,
            player,
            traitsById,
            content.config.itemCap,
          ),
        ]
      : [];
  });
  const bestFit = [...fits]
    .filter((fit) => fit.eligible && fit.score !== null)
    .sort(
      (left, right) =>
        (right.score ?? 0) - (left.score ?? 0) ||
        Number(right.deployed) - Number(left.deployed) ||
        right.star - left.star ||
        left.unitId.localeCompare(right.unitId),
    )[0] ?? null;
  const selectedFit = selectedUnitId
    ? fits.find((fit) => fit.unitId === selectedUnitId) ?? null
    : null;
  const rosterScore = {
    score: roundScore(scoreItemForPlayer(item.id, player, content)),
    duplicateOwned: playerOwnsItem(player, item.id),
  };
  const focusFit = selectedFit?.eligible ? selectedFit : bestFit;
  const duplicateNote = rosterScore.duplicateOwned
    ? " A copy is already owned, so the carousel score includes the engine's variety penalty."
    : "";

  return {
    available: true,
    itemId: item.id,
    name: item.name,
    description: item.description,
    icon: item.icon,
    effects: item.effects.map((effect) => ({ ...effect })),
    score: rosterScore.score,
    duplicateOwned: rosterScore.duplicateOwned,
    bestFit,
    selectedFit,
    explanation: focusFit
      ? `${focusFit.explanation}${duplicateNote}`
      : `Keep ${item.name} for later; no owned unit has a free item slot.${duplicateNote}`,
  };
}

export function rankItemDecisionPreviews(
  itemIds: readonly string[],
  player: PlayerState,
  content: DecisionSupportContent,
  selectedUnitId: string | null = null,
): readonly ItemDecisionPreview[] {
  return itemIds
    .map((itemId, index) => ({
      index,
      preview: buildItemDecisionPreview(
        itemId,
        player,
        content,
        selectedUnitId,
      ),
    }))
    .sort((left, right) => {
      const leftScore = left.preview.available
        ? left.preview.score
        : Number.NEGATIVE_INFINITY;
      const rightScore = right.preview.available
        ? right.preview.score
        : Number.NEGATIVE_INFINITY;
      return (
        rightScore - leftScore ||
        left.preview.itemId.localeCompare(right.preview.itemId) ||
        left.index - right.index
      );
    })
    .map(({ preview }) => preview);
}
