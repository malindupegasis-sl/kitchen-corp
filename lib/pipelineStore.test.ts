// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleTargets } from "@/data/sample";
import { createPipelineStore } from "./pipelineStore";
import { STORAGE_KEY, type StorageLike } from "./storage";
import { blankTarget } from "./types";

function fakeStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
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

/** One storage instance per store, as in a real browser. */
function storageFactory() {
  const storage = fakeStorage();
  return () => storage;
}

describe("pipelineStore", () => {
  beforeEach(() => {
    // The store only hydrates when it believes it is in a browser.
    vi.stubGlobal("window", {});
  });

  it("loads the sample data on first visit and persists it", () => {
    const storage = fakeStorage();
    const store = createPipelineStore(() => storage);
    const snap = store.getSnapshot();
    expect(snap.hydrated).toBe(true);
    expect(snap.targets).toHaveLength(20);
    expect(JSON.parse(storage.data[STORAGE_KEY]).targets).toHaveLength(20);
  });

  it("reloads saved edits instead of the sample", () => {
    const storage = fakeStorage();
    const first = createPipelineStore(() => storage);
    first.getSnapshot();
    first.updateTarget("t_smashed", { name: "Edited", rentPctRevenue: 13.5 });

    const second = createPipelineStore(() => storage);
    const t = second.getSnapshot().targets.find((x) => x.id === "t_smashed")!;
    expect(t.name).toBe("Edited");
    expect(t.rentPctRevenue).toBe(13.5);
  });

  it("adds, removes, resets and notifies subscribers", () => {
    const store = createPipelineStore(storageFactory());
    const listener = vi.fn();
    store.subscribe(listener);
    const id = store.addTarget();
    expect(store.getSnapshot().targets.at(-1)?.id).toBe(id);
    store.removeTarget(id);
    expect(store.getSnapshot().targets).toHaveLength(20);
    store.updateTarget("t_smashed", { name: "x" });
    store.resetToSample();
    expect(store.getSnapshot().targets).toEqual(sampleTargets);
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("imports in append mode (upsert by id) and replace mode", () => {
    const store = createPipelineStore(storageFactory());
    const updated = { ...sampleTargets[0], name: "Smashed MCR v2" };
    const fresh = { ...blankTarget("t_new"), name: "New Co" };
    store.importTargets([updated, fresh], "append");
    const names = store.getSnapshot().targets.map((t) => t.name);
    expect(names).toHaveLength(21);
    expect(names[0]).toBe("Smashed MCR v2");
    expect(names.at(-1)).toBe("New Co");

    store.importTargets([fresh], "replace");
    expect(store.getSnapshot().targets).toEqual([fresh]);
  });

  it("re-applies the default integration load when the type changes", () => {
    const store = createPipelineStore(storageFactory());
    store.updateTarget("t_tandoor", { type: "restaurant_group" }); // was single_site, load 1
    expect(store.getSnapshot().targets.find((t) => t.id === "t_tandoor")?.integrationLoad).toBe(3);
    store.updateTarget("t_smashed", { integrationLoad: 5 });
    store.updateTarget("t_smashed", { type: "franchise" }); // custom load is kept
    expect(store.getSnapshot().targets.find((t) => t.id === "t_smashed")?.integrationLoad).toBe(5);
  });

  it("reports a save error when storage is unavailable", () => {
    const store = createPipelineStore(() => null);
    expect(store.getSnapshot().saveStatus).toBe("error");
    store.updateTarget("t_smashed", { name: "y" });
    expect(store.getSnapshot().saveStatus).toBe("error");
  });
});

describe("weights", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
  });

  it("persists weights across edits and reloads, and resets them", () => {
    const factory = storageFactory();
    const store = createPipelineStore(factory);
    store.setWeights({ financial: 40, unitEconomics: 20, lease: 15, delivery: 15, price: 5, brand: 5 });
    store.updateTarget("t_smashed", { name: "x" }); // an unrelated edit must keep the weights
    expect(store.getSnapshot().weights?.financial).toBe(40);
    expect(createPipelineStore(factory).getSnapshot().weights?.financial).toBe(40);
    store.resetWeights();
    expect(store.getSnapshot().weights).toBeUndefined();
    expect(createPipelineStore(factory).getSnapshot().weights).toBeUndefined();
  });
});

describe("specialist reviews", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
  });

  it("creates, updates, persists and clears reviews", () => {
    const factory = storageFactory();
    const store = createPipelineStore(factory);
    store.setReview("t_smashed", { reviewer: "A. Specialist", notes: "Visited site 2" });
    store.setReview("t_smashed", { status: "recommended" });
    const r = store.getSnapshot().reviews!["t_smashed"];
    expect(r.reviewer).toBe("A. Specialist");
    expect(r.notes).toBe("Visited site 2");
    expect(r.status).toBe("recommended");
    expect(r.concerns).toBe("");
    expect(createPipelineStore(factory).getSnapshot().reviews!["t_smashed"].status).toBe("recommended");
    store.updateTarget("t_smashed", { name: "x" }); // unrelated edits keep reviews
    expect(store.getSnapshot().reviews!["t_smashed"].status).toBe("recommended");
    store.removeTarget("t_smashed"); // removing the target removes its review
    expect(store.getSnapshot().reviews!["t_smashed"]).toBeUndefined();
    store.setReview("t_bao", { status: "reviewed" });
    store.resetToSample();
    expect(store.getSnapshot().reviews).toBeUndefined();
  });
});
