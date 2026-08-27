import type { GameContent, MatchState } from "./types";

function serializeCanonical(value: unknown, path: string): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Non-finite number at ${path}`);
    }
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((entry, index) =>
        entry === undefined
          ? "null"
          : serializeCanonical(entry, `${path}[${index}]`),
      )
      .join(",")}]`;
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Non-plain object at ${path}`);
    }
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${serializeCanonical(record[key], `${path}.${key}`)}`,
      )
      .join(",")}}`;
  }
  throw new TypeError(`Non-serializable ${typeof value} at ${path}`);
}

export function canonicalStringify(value: unknown): string {
  return serializeCanonical(value, "$");
}

export function hashCanonicalValue(value: unknown): string {
  const input = canonicalStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashMatchState(state: MatchState): string {
  return hashCanonicalValue(state);
}

export function hashGameContent(content: GameContent): string {
  return hashCanonicalValue(content);
}
