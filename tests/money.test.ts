import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatMoney } from "../src/money";

describe("formatMoney", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["413.75", "$413.75"],
    ["1413.75", "$1,413.75"],
    ["-45.00", "-$45.00"],
    ["0.00", "$0.00"],
  ])("formats %s", (amount, expected) => {
    expect(formatMoney(amount, "USD")).toBe(expected);
  });

  it("throws for malformed development input", () => {
    vi.stubEnv("PROD", false);
    expect(() => formatMoney("4.2", "USD")).toThrow("Invalid money amount");
  });

  it("renders a dash for malformed production input", () => {
    vi.stubEnv("PROD", true);
    expect(formatMoney("4.2", "USD")).toBe("—");
  });

  it("contains none of the banned numeric-money functions", () => {
    const directory = resolve(process.cwd(), "src/money");
    const source = ["format.ts", "index.ts"]
      .map((file) => readFileSync(resolve(directory, file), "utf8"))
      .join("\n");
    for (const banned of ["parseFloat", "Number(", "toFixed(", "Math."]) {
      expect(source).not.toContain(banned);
    }
  });
});

