export type BoardSelectionUnit = {
  id: string;
  contentId: string;
  team: "player" | "enemy";
  zone: "board" | "bench";
  star: number;
  slot?: number;
  x?: number;
  y?: number;
};

function placementOrder(left: BoardSelectionUnit, right: BoardSelectionUnit) {
  if (left.zone !== right.zone) return left.zone === "board" ? -1 : 1;
  if (left.zone === "board" && right.zone === "board") {
    return (
      (left.y ?? 0) - (right.y ?? 0) ||
      (left.x ?? 0) - (right.x ?? 0) ||
      left.id.localeCompare(right.id)
    );
  }
  return (
    (left.slot ?? Number.MAX_SAFE_INTEGER) -
      (right.slot ?? Number.MAX_SAFE_INTEGER) ||
    left.id.localeCompare(right.id)
  );
}

/**
 * Resolves the canonical unit that should be selected after an accepted shop
 * purchase. A merge keeps an existing anchor ID, while a normal purchase adds
 * a new bench ID, so both cases are derived from before/after snapshots.
 */
export function resolvePurchaseSelection(
  beforeUnits: readonly BoardSelectionUnit[],
  afterUnits: readonly BoardSelectionUnit[],
  definitionId: string,
): string | null {
  const previousById = new Map(
    beforeUnits
      .filter((unit) => unit.team === "player")
      .map((unit) => [unit.id, unit] as const),
  );
  const matchingAfter = afterUnits.filter(
    (unit) =>
      unit.team === "player" && unit.contentId === definitionId,
  );

  const upgradedAnchors = matchingAfter
    .filter((unit) => {
      const previous = previousById.get(unit.id);
      return previous !== undefined && unit.star > previous.star;
    })
    .sort((left, right) => {
      const leftGain = left.star - (previousById.get(left.id)?.star ?? 0);
      const rightGain = right.star - (previousById.get(right.id)?.star ?? 0);
      return rightGain - leftGain || placementOrder(left, right);
    });
  if (upgradedAnchors[0]) return upgradedAnchors[0].id;

  const introducedCopies = matchingAfter
    .filter((unit) => !previousById.has(unit.id))
    .sort((left, right) => {
      if (left.zone !== right.zone) return left.zone === "bench" ? -1 : 1;
      return placementOrder(left, right);
    });
  return introducedCopies[0]?.id ?? null;
}

export function retainValidBoardSelection(
  selectedId: string | null,
  units: readonly Pick<BoardSelectionUnit, "id">[],
): string | null {
  if (!selectedId) return null;
  return units.some((unit) => unit.id === selectedId) ? selectedId : null;
}
