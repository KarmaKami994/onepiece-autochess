const UINT32_RANGE = 0x1_0000_0000;

export function hashSeed(seed: string | number): number {
  const text = String(seed);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0 || 0x9e3779b9;
}

export function nextRandom(state: number): {
  state: number;
  value: number;
} {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  value = (value ^ (value >>> 14)) >>> 0;
  return { state: nextState, value: value / UINT32_RANGE };
}

export function randomInt(
  state: number,
  minimum: number,
  maximumExclusive: number,
): { state: number; value: number } {
  if (maximumExclusive <= minimum) {
    return { state, value: minimum };
  }
  const next = nextRandom(state);
  return {
    state: next.state,
    value:
      minimum +
      Math.floor(next.value * Math.max(1, maximumExclusive - minimum)),
  };
}

export function shuffleDeterministic<T>(
  values: readonly T[],
  state: number,
): { state: number; values: T[] } {
  const shuffled = [...values];
  let nextState = state;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const random = randomInt(nextState, 0, index + 1);
    nextState = random.state;
    [shuffled[index], shuffled[random.value]] = [
      shuffled[random.value],
      shuffled[index],
    ];
  }
  return { state: nextState, values: shuffled };
}

export function weightedIndex(
  weights: readonly number[],
  state: number,
): { state: number; index: number } {
  const total = weights.reduce(
    (sum, weight) => sum + Math.max(0, weight),
    0,
  );
  if (total <= 0) {
    return { state, index: -1 };
  }
  const next = nextRandom(state);
  let cursor = next.value * total;
  for (let index = 0; index < weights.length; index += 1) {
    cursor -= Math.max(0, weights[index]);
    if (cursor < 0) {
      return { state: next.state, index };
    }
  }
  return { state: next.state, index: weights.length - 1 };
}
