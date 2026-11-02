import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useState } from "preact/hooks";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OnRequestAvailability, ShuttleSearchResult } from "../src/api/client";
import { ShuttleDepartures } from "../src/app/shuttle/Departures";
import { PassengerDropdown } from "../src/app/shuttle/PassengerDropdown";
import { ShuttleTrip } from "../src/app/shuttle/Trip";
import type { SelectedShuttleLeg, ShuttleTripForm } from "../src/app/shuttle/types";
import { DEPARTURE, LOCATION_GROUPS, SEARCH_RESULT } from "./shuttle-fixtures";

const TRIP: ShuttleTripForm = {
  fromId: "", toId: "", date: "2026-10-30", returnDate: "2026-11-01",
  roundTrip: false, largeBags: 0, smallBags: 0,
  paxAdult: 1, paxSenior: 0, paxChild: 0,
};

const SHARED_OPTION = {
  departure_type: "on_request", route_id: SEARCH_RESULT.route.id,
  vehicle_type_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  vehicle_type_name: "Executive Van", seat_capacity: 8, from_price: "38.50",
  effective_min_passengers: 1, service_mode: "shared",
  earliest_pickup_date: "2026-10-30", earliest_pickup_time: "11:00",
} satisfies OnRequestAvailability;

const PRIVATE_OPTION = {
  ...SHARED_OPTION, vehicle_type_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  vehicle_type_name: "Private Van", seat_capacity: 6, from_price: "150.00",
  service_mode: "private",
} satisfies OnRequestAvailability;

function root(): HTMLElement {
  const element = document.createElement("div");
  document.body.append(element);
  return element;
}

function change(input: HTMLInputElement, value: string) {
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function renderTrip() {
  const element = root();
  render(<ShuttleTrip destinationGroups={LOCATION_GROUPS.slice(1)} errors={{}}
    form={TRIP} formError={null} loadingDestinations={false} loadingLocations={false}
    maximumBags={12} minimumDate="2026-10-23" originGroups={LOCATION_GROUPS}
    submitting={false} timeZone="America/Chicago" onSubmit={() => undefined}
    update={() => undefined} />, element);
  return element;
}

function renderDepartures(
  result: ShuttleSearchResult,
  direction: "outbound" | "return" = "outbound",
  onChoose: (leg: SelectedShuttleLeg) => void = () => undefined,
  selected: SelectedShuttleLeg | null = null,
) {
  const element = root();
  render(<ShuttleDepartures currency="USD" notice={null} loadingOutbound={false}
    outboundData={{ result: direction === "outbound" ? result
      : { ...SEARCH_RESULT, departures: [] }, date: "2026-10-30", direction: "outbound" }}
    returnData={direction === "return" ? { result, date: "2026-10-30", direction } : null}
    loadingReturn={false} passengerCount={1}
    selectedOutbound={direction === "outbound" ? selected : null}
    selectedReturn={direction === "return" ? selected : null}
    onBack={() => undefined}
    onChooseOutbound={onChoose} onChooseReturn={onChoose}
  />, element);
  return element;
}

function PassengerHarness(props: {
  form?: ShuttleTripForm;
}) {
  const [form, setForm] = useState(props.form ?? TRIP);
  const update = <Key extends keyof ShuttleTripForm>(key: Key, value: ShuttleTripForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  return <PassengerDropdown error={undefined} form={form}
    update={update} />;
}

function renderPassengers(props: Parameters<typeof PassengerHarness>[0] = {}) {
  const element = root();
  render(<PassengerHarness {...props} />, element);
  act(() => element.querySelector<HTMLButtonElement>(".passenger-trigger")?.click());
  return element;
}

beforeEach(() => document.body.replaceChildren());

describe("shuttle trip fields", () => {
  it("renders grouped reachable locations and the business timezone date guard", () => {
    const element = renderTrip();
    act(() => element.querySelector<HTMLInputElement>("#fromId")?.click());
    const groups = [...element.querySelectorAll(".stop-category")];
    expect(groups.map((group) => group.textContent?.trim())).toEqual(["Airports", "Galveston"]);
    expect(element.querySelector<HTMLInputElement>("#toId")?.disabled).toBe(true);
    expect(element.querySelector<HTMLInputElement>("#date")?.min).toBe("2026-10-23");
    expect(element.textContent).toContain("Dates and times use America/Chicago");
  });

  it("shows adult, senior and child controls before the first search", () => {
    const unpriced = renderTrip();
    act(() => unpriced.querySelector<HTMLButtonElement>(".passenger-trigger")?.click());
    expect(unpriced.querySelector("#paxAdult")?.textContent).toBe("1");
    expect(unpriced.querySelector("#paxSenior")?.textContent).toBe("0");
    expect(unpriced.querySelector("#paxChild")?.textContent).toBe("0");
    expect(unpriced.querySelector(".passenger-trigger .field-chevron svg")).not.toBeNull();
    expect(unpriced.querySelector(".passenger-trigger")?.textContent).not.toContain("▾");
  });

  it("uses one unchecked Round trip checkbox and no trip-type radios", () => {
    const element = renderTrip();
    const checkbox = element.querySelector<HTMLInputElement>('.trip-kind input[type="checkbox"]');
    expect(checkbox?.checked).toBe(false);
    expect(element.querySelectorAll('.trip-kind input[type="checkbox"]')).toHaveLength(1);
    expect(element.querySelector('.trip-kind input[type="radio"]')).toBeNull();
    expect(element.querySelector("#returnDate")).toBeNull();
    expect(element.querySelector(".shuttle-trip-fields")?.classList.contains("date-time-grid"))
      .toBe(true);
    act(() => element.querySelector<HTMLLabelElement>(".trip-kind")?.click());
    expect(checkbox?.checked).toBe(true);
  });

  it("sends false when Round trip is unchecked", () => {
    const update = vi.fn();
    const element = root();
    render(<ShuttleTrip destinationGroups={LOCATION_GROUPS.slice(1)} errors={{}}
      form={{ ...TRIP, roundTrip: true }} formError={null} loadingDestinations={false}
      loadingLocations={false} maximumBags={12} minimumDate="2026-10-23"
      originGroups={LOCATION_GROUPS}
      submitting={false}
      timeZone="America/Chicago" onSubmit={() => undefined} update={update} />, element);
    act(() => element.querySelector<HTMLLabelElement>('.trip-kind')?.click());
    expect(update).toHaveBeenCalledWith("roundTrip", false);
    expect(element.querySelector(".shuttle-return-fields")?.classList.contains("date-time-grid"))
      .toBe(true);
  });
});

describe("shuttle luggage fields", () => {
  it("renders Bags and Carry-on with the taxi stepper controls and icons", () => {
    const element = renderTrip();
    const labels = [...element.querySelectorAll(".bag-label")]
      .map((label) => label.textContent?.trim());
    expect(labels).toEqual(["Bags", "Carry-on"]);
    expect(element.querySelectorAll(".bag-icon")).toHaveLength(2);
    expect(element.querySelectorAll(".bag-counter .counter-controls")).toHaveLength(2);
    expect(element.querySelector("#largeBags output")?.textContent).toBe("0");
    expect(element.querySelector("#smallBags output")?.textContent).toBe("0");
  });
});

describe("shuttle trip compact styling", () => {
  it("fits the round-trip box to its checkbox row", () => {
    const css = readFileSync(resolve("src/styles/shuttle.css"), "utf8");
    expect(css).toMatch(/\.trip-kind\s*\{[^}]*padding:\s*0 10px/s);
    expect(css).toMatch(/\.trip-kind\s*\{[^}]*min-height:\s*38px/s);
    expect(css).toMatch(/\.trip-kind:focus-within\s*\{[^}]*outline:/s);
  });

  it("keeps fixed and any-time rows full-width in the 360px container layout", () => {
    const css = readFileSync(resolve("src/styles/shuttle.css"), "utf8");
    expect(css).toMatch(/\.departure-section\s*\{[^}]*width:\s*100%/s);
    expect(css).toMatch(/\.on-request-section\s*\{[^}]*width:\s*100%/s);
    expect(css).toMatch(/\.shuttle-departure\.selected\s*\{[^}]*border-color:\s*var\(--blue\)/s);
    expect(css).toMatch(/:is\(\.layout-narrow, \.layout-micro\) \.shuttle-departure\s*\{/s);
    expect(css).not.toContain(".on-request-choice");
  });
});

describe("shuttle passenger dropdown interactions", () => {
  it("toggles open and closed from the trigger", () => {
    const element = renderPassengers();
    const trigger = element.querySelector<HTMLButtonElement>(".passenger-trigger");
    act(() => trigger?.click());
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(element.querySelector(".passenger-menu")).toBeNull();
    act(() => trigger?.click());
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(element.querySelector(".passenger-menu")).not.toBeNull();
  });

  it("defaults to one adult and updates the closed-state total", () => {
    const element = renderPassengers();
    expect(element.querySelector("#paxAdult")?.textContent).toBe("1");
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Decrease Adults"]')?.disabled)
      .toBe(true);
    act(() => element.querySelector<HTMLButtonElement>('[aria-label="Increase Adults"]')?.click());
    act(() => element.querySelector<HTMLButtonElement>('[aria-label="Increase Adults"]')?.click());
    expect(element.querySelector(".passenger-trigger")?.textContent).toContain("3 passengers");
  });

  it("closes on an outside pointer press", () => {
    const element = renderPassengers();
    act(() => {
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }));
    });
    expect(element.querySelector(".passenger-menu")).toBeNull();
    expect(element.querySelector(".passenger-trigger")?.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("shuttle passenger dropdown limits", () => {
  it("keeps category counters within their schema limits", () => {
    const element = renderPassengers({ form: { ...TRIP, paxAdult: 99 } });
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Increase Adults"]')?.disabled)
      .toBe(true);
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Decrease Seniors"]')?.disabled)
      .toBe(true);
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Decrease Children"]')?.disabled)
      .toBe(true);
  });

  it("closes on Escape and returns focus to the trigger", () => {
    const element = renderPassengers();
    const increase = element.querySelector<HTMLButtonElement>('[aria-label="Increase Adults"]');
    increase?.focus();
    act(() => {
      increase?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    });
    const trigger = element.querySelector<HTMLButtonElement>(".passenger-trigger");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });
});

describe("shuttle departures", () => {
  it("shows time, service label, vehicle name, seats and server price", () => {
    const hidden = { ...DEPARTURE, schedule_id: "hidden", selectable: false,
      unselectable_reason: "Return must leave later" };
    const element = renderDepartures({ ...SEARCH_RESULT, departures: [DEPARTURE, hidden] });
    expect(element.textContent).toContain("09:30 – 10:30");
    expect(element.textContent).toContain("Island Express");
    expect(element.textContent).toContain("Vehicle: Executive Van");
    expect(element.textContent).toContain("4 seats left");
    expect(element.textContent).toContain("$70.50 USD");
    expect(element.textContent).toContain("Shared");
    expect(element.textContent).not.toContain("Return must leave later");
    expect(element.querySelectorAll(".shuttle-departure")).toHaveLength(1);
  });

  it("hides the scheduled vehicle row when vehicle_type is null", () => {
    const departure = { ...DEPARTURE, vehicle_type: null };
    const element = renderDepartures({ ...SEARCH_RESULT, departures: [departure] });
    expect(element.textContent).toContain("Island Express");
    expect(element.textContent).not.toContain("Vehicle:");
  });

  it("uses the existing empty-day message", () => {
    const element = renderDepartures({ ...SEARCH_RESULT, departures: [] });
    expect(element.textContent).toContain("No departures are available for this day");
  });

  it("renders the server reason for an unselectable return without calculating chronology", () => {
    const reason = "This departure leaves before your outbound trip arrives.";
    const unavailable = { ...DEPARTURE, selectable: false, unselectable_reason: reason };
    const element = renderDepartures({ ...SEARCH_RESULT, departures: [unavailable] }, "return");
    expect(element.textContent).toContain(reason);
    expect(element.querySelector<HTMLButtonElement>(".departure-section.return button")?.disabled)
      .toBe(true);
  });
});

describe("on-request shuttle presentation", () => {
  it("uses one time field and compact server-priced rows without a date field", () => {
    const result = { ...SEARCH_RESULT, departures: [], on_request: null,
      on_request_options: [SHARED_OPTION, PRIVATE_OPTION] };
    const element = renderDepartures(result);
    expect(element.textContent).toContain("Choose Departure · Fri, Oct 30");
    expect(element.querySelector('input[type="date"]')).toBeNull();
    expect(element.querySelectorAll('input[type="time"]')).toHaveLength(1);
    expect(element.querySelectorAll(".any-time-departure")).toHaveLength(2);
    expect(element.textContent).toContain("Executive Van");
    expect(element.textContent).toContain("Private Van");
    expect(element.textContent).toContain("Shared");
    expect(element.textContent).toContain("Private");
    expect(element.textContent).toContain("$38.50 USD");
    expect(element.textContent).toContain("$150.00 USD");
    expect(element.textContent).not.toContain("From $");
    for (const button of element.querySelectorAll<HTMLButtonElement>(".any-time-departure button")) {
      expect(button.disabled).toBe(true);
      expect(button.title).toBe("Pick a time first");
    }
  });

  it("shows fixed rows first, then one any-time subsection with field errors", () => {
    const result = { ...SEARCH_RESULT, departures: [DEPARTURE], on_request: null,
      on_request_options: [SHARED_OPTION, PRIVATE_OPTION] };
    const element = renderDepartures(result);
    const fixed = element.querySelector(".shuttle-departures");
    const anyTime = element.querySelector(".on-request-section");
    expect(element.textContent).toContain("Or pick your own time");
    expect(fixed).not.toBeNull();
    expect(anyTime).not.toBeNull();
    expect(fixed!.compareDocumentPosition(anyTime!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    const picker = element.querySelector<HTMLInputElement>('[data-shuttle-time="outbound"]');
    expect(picker?.min).toBe("11:00");
    change(picker!, "10:30");
    expect(element.textContent).toContain("Choose a time at or after 11:00");
  });
});

describe("on-request shuttle selection", () => {
  it("chooses the Trip-step date and shared time and marks the selected row", () => {
    const choose = vi.fn();
    const selected = {
      kind: "on_request", date: "2026-10-30", time: "12:15", serviceMode: "private",
      routeId: PRIVATE_OPTION.route_id, route: SEARCH_RESULT.route,
      vehicleTypeId: PRIVATE_OPTION.vehicle_type_id,
      vehicleTypeName: PRIVATE_OPTION.vehicle_type_name,
    } satisfies SelectedShuttleLeg;
    const result = { ...SEARCH_RESULT, departures: [], on_request: null,
      on_request_options: [SHARED_OPTION, PRIVATE_OPTION] };
    const element = renderDepartures(result, "outbound", choose, selected);
    const picker = element.querySelector<HTMLInputElement>('[data-shuttle-time="outbound"]')!;
    change(picker, "12:15");
    expect(picker.hasAttribute("aria-describedby")).toBe(false);
    const rows = element.querySelectorAll<HTMLElement>(".any-time-departure");
    expect(rows[1]?.classList.contains("selected")).toBe(true);
    expect(rows[1]?.querySelector("button")?.textContent).toBe("Selected");
    act(() => rows[0]?.querySelector<HTMLButtonElement>("button")?.click());
    expect(choose).toHaveBeenCalledWith(expect.objectContaining({
      kind: "on_request", date: "2026-10-30", time: "12:15",
      vehicleTypeId: SHARED_OPTION.vehicle_type_id,
    }));
  });

  it("renders one independent time field for each round-trip leg", () => {
    const result = { ...SEARCH_RESULT, departures: [], on_request: null,
      on_request_options: [PRIVATE_OPTION] };
    const element = root();
    render(<ShuttleDepartures currency="USD" notice={null} loadingOutbound={false}
      outboundData={{ result, date: "2026-11-04", direction: "outbound" }}
      returnData={{ result, date: "2026-11-07", direction: "return" }} loadingReturn={false}
      passengerCount={1} selectedOutbound={null} selectedReturn={null}
      onBack={() => undefined} onChooseOutbound={() => undefined}
      onChooseReturn={() => undefined} />, element);
    expect(element.querySelectorAll('input[type="date"]')).toHaveLength(0);
    expect(element.querySelectorAll('input[type="time"]')).toHaveLength(2);
    expect(element.textContent).toContain("Choose Departure · Wed, Nov 4");
    expect(element.textContent).toContain("Choose Return · Sat, Nov 7");
  });
});
