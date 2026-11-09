import type { FoodReceipt, GameContent, MatchState, PlayerState, PreparedMeal } from "./types";

export const FOOD_STOCK_CAP = 3;

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const id = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 200;
export function isPreparedMeal(value: unknown): value is PreparedMeal {
  return record(value) && id(value.id) && id(value.foodId) && id(value.unitId) &&
    typeof value.round === "number" && Number.isInteger(value.round) && value.round >= 1;
}
export function isFoodReceipt(value: unknown): value is FoodReceipt {
  return record(value) && id(value.id) && id(value.foodId) && id(value.playerId) &&
    typeof value.round === "number" && Number.isInteger(value.round) && value.round >= 1 &&
    ["received", "served", "applied", "expired"].includes(String(value.kind)) &&
    (value.unitId === undefined || id(value.unitId)) &&
    (value.goldPaid === undefined || (typeof value.goldPaid === "number" && Number.isSafeInteger(value.goldPaid) && value.goldPaid >= 0));
}

export function getFoodDefinition(id: string, content: GameContent) {
  return content.foods?.find(food => food.id === id) ?? null;
}

export function canReceiveFood(player: PlayerState): boolean {
  return (player.foodInventory?.length ?? 0) < FOOD_STOCK_CAP;
}

export function recordFoodReceipt(state: MatchState, receipt: FoodReceipt): void {
  state.foodHistory ??= [];
  if (!state.foodHistory.some(existing => existing.id === receipt.id)) state.foodHistory.push(receipt);
}

export function foodUseError(state: MatchState, player: PlayerState, foodId: string, unitId: string, content: GameContent): string | null {
  if (state.phase !== "preparation") return "Meals can only be served during preparation.";
  if (player.pendingMeal) return "Only one meal can be served per preparation.";
  if (!getFoodDefinition(foodId, content) || !player.foodInventory?.includes(foodId)) return "That portion is not in your galley.";
  if (!player.units[unitId] || !Object.values(player.board).includes(unitId)) return "Choose one of your deployed crew members.";
  return null;
}

export function serveFood(state: MatchState, player: PlayerState, foodId: string, unitId: string, content: GameContent): boolean {
  if (foodUseError(state, player, foodId, unitId, content)) return false;
  const stock = player.foodInventory ?? [];
  stock.splice(stock.indexOf(foodId), 1);
  player.pendingMeal = { id: `meal-${state.nextChoiceSerial++}`, foodId, unitId, round: state.round };
  recordFoodReceipt(state, { ...player.pendingMeal, playerId: player.id, kind: "served" });
  return true;
}

/** Freeze before any pairing, including ghost copies. Regeneration never calls this. */
export function freezeBattleMeals(state: MatchState, content: GameContent): void {
  state.battleMeals = {};
  for (const player of state.players) {
    const meal = player.pendingMeal;
    if (!meal) continue;
    const applies = player.alive && meal.round === state.round && !!getFoodDefinition(meal.foodId, content) &&
      !!player.units[meal.unitId] && Object.values(player.board).includes(meal.unitId);
    if (applies) state.battleMeals[player.id] = { ...meal };
    recordFoodReceipt(state, { ...meal, id: `${meal.id}:resolved`, playerId: player.id, kind: applies ? "applied" : "expired" });
    delete player.pendingMeal;
  }
}

export function mealForUnit(meal: PreparedMeal | undefined, unitId: string): string | undefined {
  return meal?.unitId === unitId ? meal.foodId : undefined;
}
