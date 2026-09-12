import { getAcquirableItems } from "./items";
import { randomInt, shuffleDeterministic } from "./rng";
import type {
  GameContent,
  ItemDefinition,
  StageItemRewardDefinition,
} from "./types";

export type ItemRewardSelection = {
  itemIds: string[];
  rngState: number;
};

function stableRewardPool(
  reward: StageItemRewardDefinition,
  content: GameContent,
): ItemDefinition[] {
  const items = reward.itemKind === "component"
    ? getAcquirableItems(content).filter((item) => item.kind === "component")
    : content.items.filter((item) => item.kind === "completed");
  const eligible = items.filter((item) => !reward.excludeTraitGrantItems || !item.grantedTraitId);
  return reward.itemKind === "component"
    ? eligible
    : eligible.sort((left, right) => left.id.localeCompare(right.id));
}

function distinctSelection(
  pool: readonly ItemDefinition[],
  count: number,
  rngState: number,
): ItemRewardSelection {
  if (count > pool.length) {
    throw new Error(`Item reward requests ${count} distinct items from ${pool.length}.`);
  }
  const shuffled = shuffleDeterministic(pool, rngState);
  return {
    itemIds: shuffled.values.slice(0, count).map((item) => item.id),
    rngState: shuffled.state,
  };
}

function repeatedSelection(
  pool: readonly ItemDefinition[],
  count: number,
  rngState: number,
): ItemRewardSelection {
  if (pool.length === 0 && count > 0) {
    throw new Error("Item reward pool is empty.");
  }
  const itemIds: string[] = [];
  let nextState = rngState;
  for (let index = 0; index < count; index += 1) {
    const selected = randomInt(nextState, 0, pool.length);
    nextState = selected.state;
    const item = pool[selected.value];
    if (item) itemIds.push(item.id);
  }
  return { itemIds, rngState: nextState };
}

function controlledCompletedChoice(
  pool: readonly ItemDefinition[],
  count: number,
  rngState: number,
): ItemRewardSelection {
  const nonTrait = pool.filter((item) => !item.grantedTraitId);
  const first = shuffleDeterministic(nonTrait, rngState);
  const guaranteedNonTrait = first.values.slice(0, Math.min(2, count));
  const selectedIds = new Set(guaranteedNonTrait.map((item) => item.id));
  const remainder = shuffleDeterministic(
    pool.filter((item) => !selectedIds.has(item.id)),
    first.state,
  );
  return {
    itemIds: [
      ...guaranteedNonTrait,
      ...remainder.values.slice(0, count - guaranteedNonTrait.length),
    ].map((item) => item.id),
    rngState: remainder.state,
  };
}

export function selectStageItemReward(
  reward: StageItemRewardDefinition,
  content: GameContent,
  rngState: number,
): ItemRewardSelection {
  const count = reward.mode === "choice"
    ? reward.offerCount ?? reward.amount
    : reward.amount;
  const pool = stableRewardPool(reward, content);
  if (
    reward.mode === "choice" &&
    reward.itemKind === "completed" &&
    !reward.excludeTraitGrantItems
  ) {
    return controlledCompletedChoice(pool, count, rngState);
  }
  return reward.distinct
    ? distinctSelection(pool, count, rngState)
    : repeatedSelection(pool, count, rngState);
}
