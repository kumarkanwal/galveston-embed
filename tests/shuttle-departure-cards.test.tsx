import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShuttleSearchResult } from "../src/api/client";
import { ShuttleDepartures } from "../src/app/shuttle/Departures";
import type { SelectedShuttleLeg } from "../src/app/shuttle/types";
import { DEPARTURE, PRIVATE_CAR, SEARCH_RESULT } from "./shuttle-fixtures";

function renderDepartures(
  result: ShuttleSearchResult,
  onChoose: (leg: SelectedShuttleLeg) => void = () => undefined,
  selected: SelectedShuttleLeg | null = null,
) {
  const element = document.createElement("div");
  document.body.append(element);
  render(<ShuttleDepartures currency="USD" notice={null} loadingOutbound={false}
    outboundData={{ result, date: "2026-10-30", direction: "outbound" }}
    returnData={null} loadingReturn={false} passengerCount={1}
    selectedOutbound={selected} selectedReturn={null} onBack={() => undefined}
    onChooseOutbound={onChoose} onChooseReturn={() => undefined} />, element);
  return element;
}

beforeEach(() => document.body.replaceChildren());

describe("desktop departure card styles", () => {
  it("uses a covered 120 by 80 image, capacity divider, and note pill", () => {
    const css = readFileSync(resolve("src/styles/shuttle.css"), "utf8");
    expect(css).toMatch(/\.departure-image-frame\s*\{[^}]*height:\s*80px;[^}]*width:\s*120px/s);
    expect(css).toMatch(/\.departure-image\s*\{[^}]*object-fit:\s*cover/s);
    expect(css).toMatch(/\.departure-capacity\s*\{[^}]*border-left:/s);
    expect(css).toMatch(/\.departure-note\s*\{[^}]*background:\s*#e9f5fb/s);
  });
});

describe("shuttle departure card content", () => {
  it("shows public shared details and the server selling-fast message", () => {
    const hidden = { ...DEPARTURE, schedule_id: "hidden", selectable: false,
      unselectable_reason: "Return must leave later" };
    const element = renderDepartures({ ...SEARCH_RESULT, departures: [DEPARTURE, hidden] });
    expect(element.textContent).toContain("09:30");
    expect(element.textContent).not.toContain("10:30");
    expect(element.textContent).not.toContain("Island Express");
    expect(element.textContent).toContain("60 min");
    expect(element.textContent).toContain("Vehicle: Executive Van");
    expect(element.textContent).toContain("4 seats left");
    expect(element.textContent).toContain("$70.50 USD");
    expect(element.textContent).toContain("Selling fast! Less than 10 seats left");
    expect(element.querySelectorAll(".shuttle-departure")).toHaveLength(1);
    expect(element.querySelector(".shuttle-departure")?.getAttribute("role")).toBe("group");
  });

  it("uses the B-53 vehicle display name when the legacy reference is null", () => {
    const element = renderDepartures({ ...SEARCH_RESULT,
      departures: [{ ...DEPARTURE, vehicle_type: null }] });
    expect(element.textContent).toContain("Vehicle: Executive Van");
  });
});

describe("shuttle departure images and notes", () => {
  it("shows the lazy vehicle image and a neutral placeholder when null", () => {
    const withImage = { ...DEPARTURE, image_url: "https://images.example/van.webp" };
    const imageCard = renderDepartures({ ...SEARCH_RESULT, departures: [withImage] });
    const image = imageCard.querySelector<HTMLImageElement>(".departure-image");
    expect(image?.src).toBe("https://images.example/van.webp");
    expect(image?.alt).toBe("Executive Van");
    expect(image?.getAttribute("loading")).toBe("lazy");
    const fallbackCard = renderDepartures({ ...SEARCH_RESULT, departures: [DEPARTURE] });
    expect(fallbackCard.querySelector(".departure-image")).toBeNull();
    expect(fallbackCard.querySelector(".departure-image-placeholder")?.getAttribute("role"))
      .toBe("img");
  });

  it("shows a customer note pill only when the server provides one", () => {
    const withNote = { ...DEPARTURE, customer_note: "Call after collecting luggage." };
    const noted = renderDepartures({ ...SEARCH_RESULT, departures: [withNote] });
    expect(noted.querySelector(".departure-note")?.textContent)
      .toContain("Customer note: Call after collecting luggage.");
    expect(renderDepartures(SEARCH_RESULT).querySelector(".departure-note")).toBeNull();
  });
});

describe("shuttle departure order and selection", () => {
  it("orders shared departures by time before private cars", () => {
    const late = { ...DEPARTURE, schedule_id: "late", start_time: "17:00" };
    const early = { ...DEPARTURE, schedule_id: "early", start_time: "08:00" };
    const element = renderDepartures({ ...SEARCH_RESULT,
      departures: [late, early], private_cars: [PRIVATE_CAR] });
    expect([...element.querySelectorAll(".departure-primary")]
      .map((node) => node.textContent?.trim())).toEqual(["08:00", "17:00", "Private SUV"]);
  });

  it("changes the labelled Choose state to Selected", () => {
    const onChoose = vi.fn();
    const plain = renderDepartures(SEARCH_RESULT, onChoose);
    const choose = plain.querySelector<HTMLButtonElement>(".shuttle-departure button");
    expect(choose?.getAttribute("aria-label")).toBe("Choose Executive Van at 09:30");
    act(() => choose?.click());
    expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ kind: "scheduled" }));
    const selected = { kind: "scheduled" as const, date: "2026-10-30",
      departure: DEPARTURE, route: SEARCH_RESULT.route };
    const button = renderDepartures(SEARCH_RESULT, undefined, selected)
      .querySelector<HTMLButtonElement>(".shuttle-departure button");
    expect(button?.textContent).toBe("Selected");
    expect(button?.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("server departure prices", () => {
  it("shows the mix total instead of the cheapest seat price", () => {
    const departure = { ...DEPARTURE, total_for_selection: "91.00",
      prices: { adult: "10.00", senior: "12.00", child: "8.00" } };
    const element = renderDepartures({ ...SEARCH_RESULT, departures: [departure] });
    expect(element.textContent).toContain("$91.00 USD");
    expect(element.textContent).not.toContain("$8.00 USD");
  });

  it("shows each round-trip direction's own server price", () => {
    const element = document.createElement("div");
    document.body.append(element);
    const outbound = { ...DEPARTURE, total_for_selection: "130.00" };
    const returning = { ...DEPARTURE, schedule_id: "return", total_for_selection: "145.00" };
    render(<ShuttleDepartures currency="USD" notice={null} loadingOutbound={false}
      outboundData={{ result: { ...SEARCH_RESULT, departures: [outbound] },
        date: "2026-11-04", direction: "outbound" }}
      returnData={{ result: { ...SEARCH_RESULT, departures: [returning] },
        date: "2026-11-07", direction: "return" }} loadingReturn={false}
      passengerCount={2} selectedOutbound={null} selectedReturn={null}
      onBack={() => undefined} onChooseOutbound={() => undefined}
      onChooseReturn={() => undefined} />, element);
    expect(element.textContent).toContain("$130.00 USD");
    expect(element.textContent).toContain("$145.00 USD");
  });
});
