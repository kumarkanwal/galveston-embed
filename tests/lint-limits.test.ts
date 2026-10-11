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

