import type { FoodReceipt } from "../game/types";

/** Factual counts only; food never enters item acquisition/economy metrics. */
export function summarizeFood(receipts: readonly FoodReceipt[]) {
  const result = { received: 0, served: 0, applied: 0, expired: 0, goldSpent: 0,
    byFood: {} as Record<string, { received: number; served: number; applied: number; expired: number }> };
  for (const receipt of receipts) {
    result[receipt.kind] += 1;
    const food = result.byFood[receipt.foodId] ??= { received: 0, served: 0, applied: 0, expired: 0 };
    food[receipt.kind] += 1;
    if (receipt.kind === "received") result.goldSpent += receipt.goldPaid ?? 0;
  }
  return result;
}
