import type { Weights } from "./engine/types";
import type { AcquirerProfile, Target } from "./types";

export const STORAGE_KEY = "kitchen-corp:pipeline:v1";

export interface PipelineState {
  acquirer: AcquirerProfile;
  targets: Target[];
  /** Scoring weights for the acquisition lens; absent means the lens defaults. */
  weights?: Partial<Weights>;
}

/** The subset of the Storage interface we use, so tests can pass a fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Returns the saved pipeline, or null if nothing valid is stored. Never throws. */
export function loadPipeline(storage: StorageLike | null = browserStorage()): PipelineState | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPipelineState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Saves the pipeline. Returns false if storage is unavailable or full. */
export function savePipeline(
  state: PipelineState,
  storage: StorageLike | null = browserStorage(),
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearPipeline(storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function isPipelineState(v: unknown): v is PipelineState {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const a = o.acquirer as Record<string, unknown> | undefined;
  return (
    !!a &&
    typeof a === "object" &&
    typeof a.name === "string" &&
    Array.isArray(o.targets)
  );
}
