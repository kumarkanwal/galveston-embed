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

  it("makes every narrow-mode widget full width without outer decoration", () => {
    expect(css).toContain(":is(.layout-compact, .layout-narrow, .layout-micro) .widget");
    expect(css).toMatch(/\.layout-micro\) \.widget \{[\s\S]*border: 0;[\s\S]*border-radius: 0;/);
    expect(css).toMatch(/\.layout-micro\) \.widget \{[\s\S]*box-shadow: none;[\s\S]*padding: 8px;/);
  });

  it("keeps the compact rows single-line through 320px and stacks below it", () => {
    expect(css).toContain(".pickup-datetime-fields {");
    expect(css).toContain("grid-template-columns: minmax(150px, 1.35fr) minmax(110px, 0.85fr)");
    expect(css).toContain("grid-template-columns: minmax(88px, 0.8fr) repeat(2, minmax(100px, 1fr))");
    expect(css).toContain(".layout-micro :is(.pickup-datetime-fields, .party-fields)");
    expect(css).toContain(".layout-micro .party-fields > [data-trip-field=\"passengers\"]");
  });

  it("clips horizontal overflow at both the shadow host and layout root", () => {
    expect(css.match(/overflow-x: clip;/g)).toHaveLength(2);
    expect(css).toMatch(/:host \{[\s\S]*max-width: 100%;[\s\S]*width: 100%;/);
    expect(css).toMatch(/\.widget-root \{[\s\S]*min-width: 0;[\s\S]*width: 100%;/);
  });
});
