import { describe, expect, it } from "vitest";
import { formatGbp } from "./format";

describe("formatGbp", () => {
  it("formats whole pounds with thousands separators", () => {
    expect(formatGbp(18_000_000)).toBe("£18,000,000");
  });

  it("rounds to whole pounds", () => {
    expect(formatGbp(1234.56)).toBe("£1,235");
  });
});
