"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { runVerdicts, type VerdictsInput, type VerdictsResult } from "@/lib/engine/verdicts";

const workerSupported = typeof window !== "undefined" && typeof Worker !== "undefined";

interface Delivered {
  input: VerdictsInput;
  result: VerdictsResult;
}

/**
 * Runs the combination engine in a Web Worker (exhaustive search stays off
 * the main thread). Falls back to a synchronous run when workers are not
 * available. Returns the latest result and whether a newer one is pending.
 */
export function useVerdicts(input: VerdictsInput | null): { result: VerdictsResult | null; pending: boolean } {
  const workerRef = useRef<Worker | null>(null);
  const jobsRef = useRef(new Map<number, VerdictsInput>());
  const nextJobRef = useRef(0);
  const [delivered, setDelivered] = useState<Delivered | null>(null);
  const [failed, setFailed] = useState(false);

  const useSync = !workerSupported || failed;
  const sync = useMemo(() => (useSync && input ? runVerdicts(input) : null), [useSync, input]);

  useEffect(() => {
    if (useSync || !input) return;
    if (!workerRef.current) {
      try {
        const w = new Worker(new URL("../../lib/engine/verdicts.worker.ts", import.meta.url));
        w.onmessage = (e: MessageEvent<{ id: number; result: VerdictsResult }>) => {
          const forInput = jobsRef.current.get(e.data.id);
          jobsRef.current.delete(e.data.id);
          if (forInput) setDelivered({ input: forInput, result: e.data.result });
        };
        w.onerror = () => setFailed(true);
        workerRef.current = w;
      } catch {
        // Report the failure asynchronously and fall back to the synchronous run.
        const t = setTimeout(() => setFailed(true), 0);
        return () => clearTimeout(t);
      }
    }
    const id = ++nextJobRef.current;
    jobsRef.current.set(id, input);
    workerRef.current.postMessage({ id, input });
  }, [input, useSync]);

  useEffect(() => {
    const jobs = jobsRef.current;
    return () => {
      workerRef.current?.terminate();
      jobs.clear();
    };
  }, []);

  if (useSync) return { result: sync, pending: false };
  return { result: delivered?.result ?? null, pending: !!input && delivered?.input !== input };
}
