import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production distribution", () => {
  it("contains only the embed and its sourcemap", () => {
    const files = readdirSync(resolve(process.cwd(), "dist")).sort();
    expect(files).toEqual(["embed.js", "embed.js.map"]);
  });
});
