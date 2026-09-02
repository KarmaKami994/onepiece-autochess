import type { GameContent, ItemDefinition } from "./types";

export function canonicalItemRecipeKey(
  firstComponentId: string,
  secondComponentId: string,
): string {
  return firstComponentId.localeCompare(secondComponentId) <= 0
    ? `${firstComponentId}::${secondComponentId}`
    : `${secondComponentId}::${firstComponentId}`;
}

export function isComponentItem(
  item: ItemDefinition | null | undefined,
): boolean {
  return item?.kind === "component";
}

export function resolveItemRecipe(
  firstComponentId: string,
  secondComponentId: string,
  content: Pick<GameContent, "itemRecipes">,
): string | null {
  return content.itemRecipes[
    canonicalItemRecipeKey(firstComponentId, secondComponentId)
  ] ?? null;
}

export function getAcquirableItems(
  content: Pick<GameContent, "items" | "acquirableItemIds">,
): ItemDefinition[] {
  const itemsById = new Map(content.items.map((item) => [item.id, item]));
  return content.acquirableItemIds.flatMap((itemId) => {
    const item = itemsById.get(itemId);
    return item ? [item] : [];
  });
}
