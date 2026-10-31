import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

function overLimitSource(): string {
  const longFunction = Array.from({ length: 52 }, () => "  void value;").join("\n");
  const filler = Array.from({ length: 350 }, (_, index) => `// filler ${index}`).join("\n");
  return [
    "const value: any = true;",
    "function tooLong() {",
    "  if (value) { if (value) { if (value) { if (value) { void value; } } } }",
    longFunction,
    "}",
    "tooLong();",
    filler,
  ].join("\n");
}

describe("lint limits", () => {
  it("enforces file, function, nesting, and explicit-any limits", async () => {
    const eslint = new ESLint({ cwd: process.cwd() });
    const [result] = await eslint.lintText(overLimitSource(), { filePath: "src/limit-proof.ts" });
    const rules = new Set(result?.messages.map((message) => message.ruleId));
    expect([...rules]).toEqual(expect.arrayContaining([
      "max-lines",
      "max-lines-per-function",
      "max-depth",
      "@typescript-eslint/no-explicit-any",
    ]));
  }, 10_000);
});

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0)
    + 0.0722 * (channels[2] ?? 0);
}

function contrast(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
}

describe("responsive accessibility styles", () => {
  const widgetCss = readFileSync(resolve("src/styles/widget.css"), "utf8");
  const confirmCss = readFileSync(resolve("src/styles/confirm.css"), "utf8");
  const vehicleCss = readFileSync(resolve("src/styles/vehicle.css"), "utf8");

  it("uses 38px targets, 16px controls, and a visible focus ring", () => {
    const compactRules = widgetCss.slice(widgetCss.indexOf(":is(.layout-medium"));
    expect(compactRules).toContain("font-size: 16px");
    expect(compactRules).toContain("height: 38px");
    expect(compactRules).toContain("min-height: 38px");
    expect(compactRules).toContain(".check-pricing");
    expect(compactRules).toContain(".vehicle-choose");
    expect(compactRules).toContain(".create-trip");
    expect(confirmCss).toContain("min-width: 38px");
    expect(widgetCss).toContain(".widget :where(input, select, button, [tabindex]):focus-visible");
    expect(widgetCss).toContain("outline: 3px solid var(--blue)");
    expect(confirmCss).toMatch(/\.layout-micro\) \.create-trip \{\s*min-height:\s*38px;/);
  });

  it.each(["#2f7d32", "#256528", "#b52b27", "#6b6b6b", "#337ab7"])(
    "%s meets WCAG AA against white",
    (color) => expect(contrast(color, "#ffffff")).toBeGreaterThanOrEqual(4.5),
  );

  it("reserves photo space and keeps 320px vehicle cards with 38px actions", () => {
    const phoneRules = vehicleCss.slice(vehicleCss.indexOf(":is(.layout-narrow"));
    expect(vehicleCss).toMatch(/\.vehicle-photo-frame[\s\S]*height:\s*70px;[\s\S]*width:\s*110px;/);
    expect(vehicleCss).toMatch(/\.vehicle-photo\s*\{[\s\S]*object-fit:\s*contain;/);
    expect(phoneRules).toContain("grid-template-columns: 72px minmax(0, 1fr)");
    expect(phoneRules).toContain("height: 50px");
    expect(phoneRules).toContain("width: 66px");
    expect(widgetCss).toMatch(/\.vehicle-choose[\s\S]*min-height:\s*38px;/);
  });
});

