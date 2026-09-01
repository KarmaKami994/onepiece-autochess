import { parseCell } from "./state";
import { reconcileProductionFormProgression } from "./forms";
import { getItemDefinition } from "./content";
import { isComponentItem } from "./items";
import type {
  GameContent,
  MatchState,
  PlayerState,
  StarLevel,
  UnitInstance,
} from "./types";

export type UnitLocation =
  | { zone: "board"; key: string; x: number; y: number }
  | { zone: "bench"; slot: number }
  | null;

export function firstEmptyBench(player: PlayerState): number {
  return player.bench.findIndex((unitId) => unitId === null);
}

export function boardUnitCount(player: PlayerState): number {
  return Object.keys(player.board).length;
}

export function locateUnit(
  player: PlayerState,
  unitId: string,
): UnitLocation {
  const boardEntry = Object.entries(player.board).find(
    ([, candidateId]) => candidateId === unitId,
  );
  if (boardEntry) {
    const position = parseCell(boardEntry[0]);
    return {
      zone: "board",
      key: boardEntry[0],
      x: position.x,
      y: position.y,
    };
  }
  const slot = player.bench.indexOf(unitId);
  return slot >= 0 ? { zone: "bench", slot } : null;
}

export function removeFromLocation(
  player: PlayerState,
  unitId: string,
): void {
  const location = locateUnit(player, unitId);
  if (!location) return;
  if (location.zone === "board") delete player.board[location.key];
  else player.bench[location.slot] = null;
}

function unitMergePriority(
  player: PlayerState,
  unit: UnitInstance,
): [number, number, number] {
  const location = locateUnit(player, unit.id);
  if (location?.zone === "board") {
    return [0, location.y * 100 + location.x, unit.acquiredOrder];
  }
  if (location?.zone === "bench") {
    return [1, location.slot, unit.acquiredOrder];
  }
  return [2, 0, unit.acquiredOrder];
}

function resolveMergedItems(
  itemIds: string[],
  content: GameContent,
): { retained: string[]; returned: string[] } {
  const retained: string[] = [];
  const returned: string[] = [];
  const completedIds = new Set<string>();
  const components: string[] = [];

  for (const itemId of itemIds) {
    if (isComponentItem(getItemDefinition(itemId, content))) {
      components.push(itemId);
      continue;
    }
    if (
      completedIds.has(itemId) ||
      retained.length >= content.config.itemCap
    ) {
      returned.push(itemId);
      continue;
    }
    retained.push(itemId);
    completedIds.add(itemId);
  }

  for (const componentId of components) {
    if (
      retained.length < content.config.itemCap &&
      !retained.some((itemId) =>
        isComponentItem(getItemDefinition(itemId, content))
      )
    ) {
      retained.push(componentId);
    } else {
      returned.push(componentId);
    }
  }
  return { retained, returned };
}

function mergeUnits(
  player: PlayerState,
  definitionId: string,
  content: GameContent,
): void {
  for (const star of [1, 2] as const) {
    while (true) {
      const candidates = Object.values(player.units)
        .filter((unit) => unit.definitionId === definitionId && unit.star === star)
        .sort((left, right) => {
          const a = unitMergePriority(player, left);
          const b = unitMergePriority(player, right);
          return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
        });
      if (candidates.length < 3) break;
      const consumed = candidates.slice(0, 3);
      const anchor = consumed[0];
      const anchorLocation = locateUnit(player, anchor.id) ?? {
        zone: "bench" as const,
        slot: firstEmptyBench(player),
      };
      const combinedItems = consumed.flatMap((unit) => unit.items);
      for (const unit of consumed) {
        removeFromLocation(player, unit.id);
        if (unit.id !== anchor.id) delete player.units[unit.id];
      }
      anchor.star = (star + 1) as StarLevel;
      const mergedItems = resolveMergedItems(combinedItems, content);
      anchor.items = mergedItems.retained;
      player.inventory.push(...mergedItems.returned);
      reconcileProductionFormProgression(anchor, content);
      const safeLocation =
        anchorLocation.zone === "bench" && anchorLocation.slot < 0
          ? { zone: "bench" as const, slot: firstEmptyBench(player) }
          : anchorLocation;
      if (safeLocation.zone === "bench" && safeLocation.slot >= 0) {
        player.bench[safeLocation.slot] = anchor.id;
      } else if (safeLocation.zone === "board") {
        player.board[safeLocation.key] = anchor.id;
      }
    }
  }
}

export function canReceiveUnit(
  player: PlayerState,
  definitionId: string,
): boolean {
  return firstEmptyBench(player) >= 0 || Object.values(player.units).filter(
    (unit) => unit.definitionId === definitionId && unit.star === 1,
  ).length >= 2;
}

export function addUnitToPlayer(
  state: MatchState,
  player: PlayerState,
  definitionId: string,
  content: GameContent,
  itemId: string | null = null,
): UnitInstance | null {
  if (!canReceiveUnit(player, definitionId)) return null;
  const unit: UnitInstance = {
    id: `unit-${state.nextUnitSerial}`,
    definitionId,
    star: 1,
    items: itemId ? [itemId] : [],
    acquiredOrder: state.nextUnitSerial,
  };
  state.nextUnitSerial += 1;
  player.units[unit.id] = unit;
  const slot = firstEmptyBench(player);
  if (slot >= 0) player.bench[slot] = unit.id;
  mergeUnits(player, definitionId, content);
  return unit;
}
