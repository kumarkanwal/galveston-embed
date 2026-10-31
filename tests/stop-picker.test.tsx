import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useState } from "preact/hooks";
import { beforeEach, describe, expect, it } from "vitest";

import { StopPicker } from "../src/app/shuttle/StopPicker";
import { LOCATION_GROUPS, ORIGIN_LOCATION } from "./shuttle-fixtures";

function Harness() {
  const [value, setValue] = useState("");
  return <StopPicker disabled={false} error={undefined} groups={LOCATION_GROUPS}
    id="fromId" label="From" onChange={setValue} value={value} />;
}

function mount() {
  const root = document.createElement("div");
  document.body.append(root);
  render(<Harness />, root);
  return root;
}

function input(root: HTMLElement) {
  const field = root.querySelector<HTMLInputElement>("#fromId");
  if (field === null) throw new Error("Missing stop picker");
  return field;
}

function key(field: HTMLInputElement, value: string, altKey = false) {
  act(() => { field.dispatchEvent(new KeyboardEvent(
    "keydown", { altKey, bubbles: true, key: value })); });
}

function clickArrow(root: HTMLElement) {
  act(() => { root.querySelector(".stop-control-chevron")?.dispatchEvent(
    new MouseEvent("click", { bubbles: true })); });
}

beforeEach(() => document.body.replaceChildren());

describe("grouped accordion stop picker selection", () => {
  it("starts collapsed and keeps only one category open", () => {
    const root = mount();
    act(() => input(root).click());
    expect(root.querySelectorAll(".stop-category")).toHaveLength(2);
    expect(root.querySelectorAll(".stop-option")).toHaveLength(0);
    const categories = root.querySelectorAll<HTMLButtonElement>(".stop-category");
    act(() => categories[0]?.click());
    expect(root.textContent).toContain("Hobby Airport");
    act(() => categories[1]?.click());
    expect(root.textContent).not.toContain("Hobby Airport");
    expect(root.textContent).toContain("Cruise Terminal");
  });

  it("selects a location, closes, and reopens its highlighted category", () => {
    const root = mount();
    act(() => input(root).click());
    act(() => root.querySelector<HTMLButtonElement>(".stop-category")?.click());
    act(() => root.querySelector<HTMLButtonElement>(
      `[data-location-id="${ORIGIN_LOCATION.id}"]`)?.click());
    expect(input(root).value).toBe("Hobby Airport");
    expect(input(root).getAttribute("aria-expanded")).toBe("false");
    act(() => input(root).click());
    expect(root.querySelector(".stop-category")?.getAttribute("aria-expanded")).toBe("true");
    expect(root.querySelector(".stop-option.selected")?.textContent).toContain("Hobby Airport");
    expect(root.querySelector(".stop-option.selected .stop-check")).not.toBeNull();
  });

  it("filters locations, opens matches automatically, and reports no matches", () => {
    const root = mount();
    const field = input(root);
    act(() => field.focus());
    act(() => { field.value = "Cruise";
      field.dispatchEvent(new Event("input", { bubbles: true })); });
    expect(root.querySelectorAll(".stop-category")).toHaveLength(1);
    expect(root.textContent).toContain("Cruise Terminal");
    expect(root.querySelector(".stop-category")?.getAttribute("aria-expanded")).toBe("true");
    act(() => { field.value = "nowhere";
      field.dispatchEvent(new Event("input", { bubbles: true })); });
    expect(root.textContent).toContain("No matches");
  });
});

describe("grouped accordion stop picker toggles", () => {
  it("toggles from the whole field, including the arrow area", () => {
    const root = mount();
    const field = input(root);
    act(() => field.click());
    expect(field.getAttribute("aria-expanded")).toBe("true");
    act(() => field.click());
    expect(field.getAttribute("aria-expanded")).toBe("false");
    clickArrow(root);
    expect(field.getAttribute("aria-expanded")).toBe("true");
    clickArrow(root);
    expect(field.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("grouped accordion stop picker visuals", () => {
  it("uses SVG chevrons without bus or text-arrow icons", () => {
    const root = mount();
    const field = input(root);
    const chevron = root.querySelector(".stop-control-chevron");
    expect(chevron?.tagName.toLowerCase()).toBe("svg");
    expect(root.textContent).not.toMatch(/🚌|↳|›|⌄/u);
    act(() => field.click());
    expect(field.getAttribute("aria-expanded")).toBe("true");
    expect(chevron?.classList.contains("open")).toBe(true);
    expect(root.querySelectorAll(".stop-category .stop-chevron")).toHaveLength(2);
    const category = root.querySelector<HTMLButtonElement>(".stop-category");
    expect(category?.getAttribute("aria-expanded")).toBe("false");
    act(() => category?.click());
    expect(category?.getAttribute("aria-expanded")).toBe("true");
    expect(category?.querySelector(".stop-chevron")?.classList.contains("open")).toBe(true);
    expect(root.textContent).not.toMatch(/🚌|↳|›|⌄/u);
    const css = readFileSync(resolve("src/styles/shuttle.css"), "utf8");
    expect(css).toMatch(/\.stop-control-chevron\.open\s*\{[^}]*rotate\(180deg\)/s);
  });
});

describe("grouped accordion stop picker closing", () => {
  it("supports arrows, Enter, Escape, Tab, and outside click", () => {
    const root = mount();
    const field = input(root);
    act(() => field.click());
    key(field, "ArrowDown");
    key(field, "Enter");
    key(field, "ArrowDown");
    key(field, "Enter");
    expect(field.value).toBe("Hobby Airport");
    act(() => field.click());
    key(field, "Escape");
    expect(field.getAttribute("aria-expanded")).toBe("false");
    act(() => field.click());
    key(field, "Tab");
    expect(field.getAttribute("aria-expanded")).toBe("false");
    act(() => field.click());
    act(() => { document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); });
    expect(field.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("grouped accordion stop picker access", () => {
  it("toggles with Enter, Space, and Alt+Down", () => {
    const root = mount();
    const field = input(root);
    key(field, "Enter");
    expect(field.getAttribute("aria-expanded")).toBe("true");
    key(field, "Enter");
    expect(field.getAttribute("aria-expanded")).toBe("false");
    key(field, " ");
    expect(field.getAttribute("aria-expanded")).toBe("true");
    key(field, " ");
    expect(field.getAttribute("aria-expanded")).toBe("false");
    key(field, "ArrowDown", true);
    expect(field.getAttribute("aria-expanded")).toBe("true");
    key(field, "ArrowDown", true);
    expect(field.getAttribute("aria-expanded")).toBe("false");
  });

  it("uses combobox/listbox semantics and mobile-sized rows", () => {
    const root = mount();
    act(() => input(root).click());
    expect(input(root).getAttribute("role")).toBe("combobox");
    expect(root.querySelector('[role="listbox"]')).not.toBeNull();
    const css = readFileSync(resolve("src/styles/shuttle.css"), "utf8");
    expect(css).toMatch(/\.stop-menu\s*\{[^}]*max-height:\s*350px/s);
    expect(css).toMatch(/\.stop-category,\s*\n\.stop-option\s*\{[^}]*min-height:\s*38px/s);
  });

  it("shows a friendly empty message when the API returns no locations", () => {
    const root = document.createElement("div");
    document.body.append(root);
    render(<StopPicker disabled={false} error={undefined} groups={[]}
      id="fromId" label="From" onChange={() => undefined} value="" />, root);
    act(() => input(root).click());
    expect(root.textContent).toContain("No locations available");
  });
});
