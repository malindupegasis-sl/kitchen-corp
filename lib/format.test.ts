import { describe, expect, it } from "vitest";
import { formatGbp, formatGbpCompact } from "./format";

describe("formatGbp", () => {
  it("formats whole pounds with thousands separators", () => {
    expect(formatGbp(18_000_000)).toBe("£18,000,000");
  });

  it("rounds to whole pounds", () => {
    expect(formatGbp(1234.56)).toBe("£1,235");
  });
});

describe("formatGbpCompact", () => {
  it("drops the decimal on whole millions and uses k for thousands", () => {
    expect(formatGbpCompact(5_000_000)).toBe("£5m");
    expect(formatGbpCompact(18_000_000)).toBe("£18m");
    expect(formatGbpCompact(52_300_000)).toBe("£52.3m");
    expect(formatGbpCompact(900_000)).toBe("£900k");
    expect(formatGbpCompact(450)).toBe("£450");
    expect(formatGbpCompact(-1_500_000)).toBe("-£1.5m");
  });
});
