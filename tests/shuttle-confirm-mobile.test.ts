import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("shuttle Confirm mobile layout", () => {
  const confirmCss = readFileSync(resolve("src/styles/confirm.css"), "utf8");
  const shuttleCss = readFileSync(resolve("src/styles/shuttle-confirm.css"), "utf8");
  const widgetCss = readFileSync(resolve("src/styles/widget.css"), "utf8");
  const mobile = shuttleCss.slice(shuttleCss.indexOf(
    ":is(.layout-narrow, .layout-micro) .shuttle-confirm-layout",
  ));

  it("uses one contained column without permitting host-width overflow", () => {
    expect(confirmCss).toMatch(/\.layout-micro\) \.confirm-layout\s*\{\s*grid-template-columns:\s*1fr/s);
    expect(widgetCss.match(/overflow-x:\s*clip;/g)).toHaveLength(2);
    expect(mobile).toMatch(/\.shuttle-confirm-layout\s*\{[^}]*min-width:\s*0/s);
    expect(mobile).toMatch(/\.shuttle-trip-summary, \.shuttle-charges\)\s*\{[^}]*min-width:\s*0/s);
  });

  it("keeps summary and charge values readable at 360 pixels", () => {
    expect(mobile).toMatch(/\.shuttle-summary-row\s*\{[^}]*minmax\(0, 1fr\)/s);
    expect(mobile).toMatch(/\.charge-row\s*\{[^}]*minmax\(0, 1fr\) auto/s);
    expect(mobile).toMatch(/\.charge-row span:first-child\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  });

  it("contains promo, payment, terms, and navigation controls", () => {
    expect(mobile).toMatch(/\.shuttle-promo \.promo-code input\s*\{[^}]*width:\s*100%/s);
    expect(mobile).toMatch(/\.payment-options\s*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(mobile).toMatch(/\.terms-label\s*\{[^}]*justify-content:\s*flex-start/s);
    expect(mobile).toMatch(/\.back-button\s*\{[^}]*width:\s*100%/s);
    expect(confirmCss).toMatch(/\.create-trip\s*\{[^}]*min-height:\s*38px/s);
    expect(mobile).toMatch(/\.cash-discount-banner\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\)/s);
    expect(mobile).toMatch(/\.cash-discount-saving\s*\{[^}]*grid-column:\s*1 \/ -1/s);
  });
});
