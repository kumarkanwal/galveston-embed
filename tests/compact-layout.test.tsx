import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "preact";
import { act } from "preact/test-utils";
import { describe, expect, it, vi } from "vitest";

import {
  containerLayout,
  ResponsiveRoot,
} from "../src/app/shell/ResponsiveRoot";

describe("container-width layout", () => {
  it.each([
    [320, "narrow"],
    [375, "narrow"],
    [380, "narrow"],
    [430, "narrow"],
    [760, "full"],
  ] as const)("uses the %s px container width for the %s class", (width, expected) => {
    expect(containerLayout(width)).toBe(expected);
  });

  it("uses the two-row micro fallback only below 320px", () => {
    expect(containerLayout(319)).toBe("micro");
    expect(containerLayout(320)).not.toBe("micro");
  });

  it("updates the rendered class from ResizeObserver rather than viewport width", () => {
    type ObserverCallback = (entries: Array<{ contentRect: { width: number } }>) => void;
    let callback: ObserverCallback = () => undefined;
    const observe = vi.fn();
    class Observer {
      constructor(next: ObserverCallback) { callback = next; }
      disconnect = vi.fn();
      observe = observe;
      unobserve = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", Observer);
    const root = document.createElement("div");
    render(<ResponsiveRoot><section class="widget">Taxi or shuttle</section></ResponsiveRoot>, root);
    const wrapper = root.querySelector(".widget-root");
    expect(observe).toHaveBeenCalledWith(wrapper);
    act(() => callback([{ contentRect: { width: 375 } }]));
    expect(wrapper?.classList.contains("layout-narrow")).toBe(true);
    act(() => callback([{ contentRect: { width: 760 } }]));
    expect(wrapper?.classList.contains("layout-full")).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe("compact layout CSS", () => {
  const css = readFileSync(resolve("src/styles/widget.css"), "utf8");
  const confirmCss = readFileSync(resolve("src/styles/confirm.css"), "utf8");
  const shuttleCss = readFileSync(resolve("src/styles/shuttle.css"), "utf8");
  const vehicleCss = readFileSync(resolve("src/styles/vehicle.css"), "utf8");

  it("makes every narrow-mode widget full width without outer decoration", () => {
    expect(css).toContain(":is(.layout-compact, .layout-narrow, .layout-micro) .widget");
    expect(css).toMatch(/\.layout-micro\) \.widget \{[\s\S]*border: 0;[\s\S]*border-radius: 0;/);
    expect(css).toMatch(/\.layout-micro\) \.widget \{[\s\S]*box-shadow: none;[\s\S]*padding: 8px;/);
  });

  it("keeps the compact rows single-line through 320px and stacks below it", () => {
    expect(css).toContain(".date-time-grid {");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain("grid-template-columns: minmax(154px, 1.6fr) repeat(2, minmax(89px, 1fr))");
    expect(css).toContain(".layout-micro :is(.date-time-grid, .party-fields)");
    expect(css).toContain(".layout-micro .party-fields > [data-trip-field=\"passengers\"]");
  });

  it("clips horizontal overflow at both the shadow host and layout root", () => {
    expect(css.match(/overflow-x: clip;/g)).toHaveLength(2);
    expect(css).toMatch(/:host \{[\s\S]*max-width: 100%;[\s\S]*width: 100%;/);
    expect(css).toMatch(/\.widget-root \{[\s\S]*min-width: 0;[\s\S]*width: 100%;/);
  });

  it("uses compact 38px controls and ten-pixel vertical form rhythm", () => {
    const responsiveRules = css.slice(css.indexOf(":is(.layout-medium"));
    expect(responsiveRules).toContain("font-size: 16px");
    expect(responsiveRules).toContain("height: 38px");
    expect(responsiveRules).toContain("min-height: 38px");
    expect(css).toMatch(/\.field-row \{[\s\S]*column-gap: 22px;[\s\S]*row-gap: 10px;/);
    expect(css).toMatch(/label \{[\s\S]*margin-bottom: 4px;/);
    expect(shuttleCss).toMatch(/\.passenger-trigger \{[\s\S]*height: 38px;/);
    expect(confirmCss).toContain("row-gap: 10px");
    expect(vehicleCss).toMatch(/\.vehicle-choose,[\s\S]*min-height: 38px;/);
  });

  it("keeps passengers, Bags and Carry-on on one line at 360px", () => {
    const narrowRules = css.slice(css.indexOf(":is(.layout-narrow"));
    expect(css).toContain("grid-template-columns: minmax(154px, 1.6fr) repeat(2, minmax(89px, 1fr))");
    expect(narrowRules).not.toMatch(/\.party-fields\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
  });
});
