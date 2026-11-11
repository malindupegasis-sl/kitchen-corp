import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quotes, escaped quotes, embedded commas and newlines", () => {
    const text = 'name,notes\r\n"Bun, Patty","He said ""hi""\nthen left"\r\n';
    expect(parseCsv(text)).toEqual([
      ["name", "notes"],
      ["Bun, Patty", 'He said "hi"\nthen left'],
    ]);
  });

  it("strips a BOM and skips blank lines", () => {
    expect(parseCsv("﻿a,b\n\n1,2\n   ,\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("round-trips through toCsv", () => {
    const rows = [
      ["a", "b"],
      ['x,"y"', "line\nbreak"],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
