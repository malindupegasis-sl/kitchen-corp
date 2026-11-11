/**
 * Client-side pipeline store. A tiny external store (for useSyncExternalStore)
 * that hydrates from localStorage on first client read, falls back to the
 * fictional sample data, and persists every change.
 */
import { useSyncExternalStore } from "react";
import { sampleAcquirer, sampleTargets } from "@/data/sample";
import type { Weights } from "./engine/types";
import { newId } from "./ids";
import {
  loadPipeline,
  savePipeline,
  type PipelineState,
  type SpecialistReview,
  type StorageLike,
} from "./storage";
import {
  blankTarget,
  defaultIntegrationLoad,
  type AcquirerProfile,
  type Target,
} from "./types";

export type SaveStatus = "idle" | "saved" | "error";
export type ImportMode = "append" | "replace";

export interface PipelineSnapshot extends PipelineState {
  /** False during server render and until localStorage has been read. */
  hydrated: boolean;
  saveStatus: SaveStatus;
}

export function sampleState(): PipelineState {
  return {
    acquirer: structuredClone(sampleAcquirer),
    targets: structuredClone(sampleTargets),
  };
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function createPipelineStore(getStorage: () => StorageLike | null = browserStorage) {
  const listeners = new Set<() => void>();
  const serverSnapshot: PipelineSnapshot = {
    ...sampleState(),
    hydrated: false,
    saveStatus: "idle",
  };
  let snapshot: PipelineSnapshot = serverSnapshot;
  let initialised = false;

  function init() {
    if (initialised || typeof window === "undefined") return;
    initialised = true;
    const storage = getStorage();
    const stored = loadPipeline(storage);
    if (stored) {
      snapshot = { ...stored, hydrated: true, saveStatus: "saved" };
    } else {
      const fresh = sampleState();
      const ok = savePipeline(fresh, storage);
      snapshot = { ...fresh, hydrated: true, saveStatus: ok ? "saved" : "error" };
    }
  }

  function emit() {
    for (const l of listeners) l();
  }

  function commit(next: PipelineState) {
    if (next.weights === undefined) delete next.weights;
    if (next.reviews === undefined) delete next.reviews;
    const ok = savePipeline(next, getStorage());
    snapshot = { ...next, hydrated: true, saveStatus: ok ? "saved" : "error" };
    emit();
  }

  function current(): PipelineState {
    init(); // a mutation before any read must still start from saved data
    return { acquirer: snapshot.acquirer, targets: snapshot.targets, weights: snapshot.weights, reviews: snapshot.reviews };
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot(): PipelineSnapshot {
      init();
      return snapshot;
    },
    getServerSnapshot(): PipelineSnapshot {
      return serverSnapshot;
    },

    setAcquirer(patch: Partial<AcquirerProfile>) {
      const state = current();
      commit({ ...state, acquirer: { ...state.acquirer, ...patch } });
    },

    updateTarget(id: string, patch: Partial<Target>) {
      const state = current();
      commit({
        ...state,
        targets: state.targets.map((t) => {
          if (t.id !== id) return t;
          const next = { ...t, ...patch };
          // Changing type re-applies the default integration load unless the
          // user has already set a non-default value for the old type.
          if (patch.type && patch.type !== t.type && t.integrationLoad === defaultIntegrationLoad(t.type)) {
            next.integrationLoad = defaultIntegrationLoad(patch.type);
          }
          return next;
        }),
      });
    },

    /** Adds a blank target and returns its id. */
    addTarget(): string {
      const state = current();
      const id = newId();
      commit({ ...state, targets: [...state.targets, blankTarget(id)] });
      return id;
    },

    removeTarget(id: string) {
      const state = current();
      const reviews = { ...(state.reviews ?? {}) };
      delete reviews[id];
      commit({ ...state, targets: state.targets.filter((t) => t.id !== id), reviews });
    },

    /**
     * Append: rows whose id matches an existing target replace it, others are added.
     * Replace: the imported rows become the whole pipeline.
     */
    importTargets(incoming: Target[], mode: ImportMode) {
      const state = current();
      if (mode === "replace") {
        commit({ ...state, targets: incoming, reviews: undefined });
        return;
      }
      const byId = new Map(incoming.map((t) => [t.id, t]));
      const merged = state.targets.map((t) => byId.get(t.id) ?? t);
      const existing = new Set(state.targets.map((t) => t.id));
      for (const t of incoming) if (!existing.has(t.id)) merged.push(t);
      commit({ ...state, targets: merged });
    },

    setWeights(weights: Partial<Weights>) {
      commit({ ...current(), weights });
    },

    resetWeights() {
      commit({ ...current(), weights: undefined });
    },

    /** Create or update a specialist review. */
    setReview(targetId: string, patch: Partial<Omit<SpecialistReview, "targetId" | "updatedAt">>) {
      const state = current();
      const existing = state.reviews?.[targetId];
      const review: SpecialistReview = {
        targetId,
        reviewer: "",
        status: "draft",
        notes: "",
        concerns: "",
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      commit({ ...state, reviews: { ...(state.reviews ?? {}), [targetId]: review } });
    },

    /** Restore the sample acquirer and targets; keeps weights, clears reviews. */
    resetToSample() {
      commit({ ...sampleState(), weights: current().weights });
    },
  };
}

export type PipelineStore = ReturnType<typeof createPipelineStore>;

export const pipelineStore = createPipelineStore();

export function usePipeline(): PipelineSnapshot {
  return useSyncExternalStore(
    pipelineStore.subscribe,
    pipelineStore.getSnapshot,
    pipelineStore.getServerSnapshot,
  );
}
