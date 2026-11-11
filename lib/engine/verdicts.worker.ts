/// <reference lib="webworker" />
import { runVerdicts, type VerdictsInput } from "./verdicts";

export interface VerdictsJob {
  id: number;
  input: VerdictsInput;
}

self.onmessage = (e: MessageEvent<VerdictsJob>) => {
  const { id, input } = e.data;
  const result = runVerdicts(input);
  (self as unknown as Worker).postMessage({ id, result });
};
