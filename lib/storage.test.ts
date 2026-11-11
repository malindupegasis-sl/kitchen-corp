import { describe, expect, it } from "vitest";
import { sampleAcquirer, sampleTargets } from "@/data/sample";
import { STORAGE_KEY, clearPipeline, loadPipeline, savePipeline, type StorageLike } from "./storage";

function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

describe("storage", () => {
  it("saves and loads a pipeline", () => {
    const s = fakeStorage();
    const state = { acquirer: sampleAcquirer, targets: sampleTargets };
    expect(savePipeline(state, s)).toBe(true);
    expect(loadPipeline(s)).toEqual(state);
    clearPipeline(s);
    expect(loadPipeline(s)).toBeNull();
  });

  it("returns null for missing, corrupt or wrongly shaped data", () => {
    expect(loadPipeline(fakeStorage())).toBeNull();
    expect(loadPipeline(fakeStorage({ [STORAGE_KEY]: "{not json" }))).toBeNull();
    expect(loadPipeline(fakeStorage({ [STORAGE_KEY]: JSON.stringify({ foo: 1 }) }))).toBeNull();
  });

  it("never throws when storage is unavailable or full", () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadPipeline(broken)).toBeNull();
    expect(savePipeline({ acquirer: sampleAcquirer, targets: [] }, broken)).toBe(false);
    expect(() => clearPipeline(broken)).not.toThrow();
    expect(savePipeline({ acquirer: sampleAcquirer, targets: [] }, null)).toBe(false);
  });
});
