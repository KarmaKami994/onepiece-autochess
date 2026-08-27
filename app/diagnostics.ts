import { CURRENT_SAVE_SCHEMA_VERSION, DEFAULT_CONTENT } from "@/game";

export type DiagnosticContext = {
  screen: string;
  phase?: string;
  round?: number;
  operation: string;
};

export type DiagnosticEntry = DiagnosticContext & {
  timestamp: string;
  schemaVersion: number;
  contentVersion: string;
  errorName: string;
  errorMessage: string;
  stack?: string;
};

const STORAGE_KEY = "grand-line-auto-chess.diagnostics.v1";
const LIMIT = 50;
let memoryEntries: DiagnosticEntry[] = [];

function readStored(): DiagnosticEntry[] {
  if (typeof window === "undefined") return memoryEntries;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as DiagnosticEntry[]).slice(-LIMIT) : [];
  } catch {
    return memoryEntries;
  }
}

export function recordDiagnostic(
  error: unknown,
  context: DiagnosticContext,
): void {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const entry: DiagnosticEntry = {
    ...context,
    timestamp: new Date().toISOString(),
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    contentVersion: DEFAULT_CONTENT.version,
    errorName: normalized.name,
    errorMessage: normalized.message,
    stack: normalized.stack?.slice(0, 4_000),
  };
  memoryEntries = [...readStored(), entry].slice(-LIMIT);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryEntries));
  } catch {
    // The in-memory buffer remains available when local storage is blocked.
  }
}

export function clearDiagnostics(): void {
  memoryEntries = [];
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Clearing the in-memory copy is still useful.
  }
}

export function exportDiagnostics(): void {
  const payload = JSON.stringify(
    { exportedAt: new Date().toISOString(), entries: readStored() },
    null,
    2,
  );
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "grand-line-diagnostics.json";
  link.click();
  URL.revokeObjectURL(url);
}
