import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useState } from "preact/hooks";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShuttleSearchResult } from "../src/api/client";
import { ShuttleDepartures } from "../src/app/shuttle/Departures";
import { PassengerDropdown } from "../src/app/shuttle/PassengerDropdown";
import { ShuttleTrip } from "../src/app/shuttle/Trip";
import type { SelectedShuttleLeg, ShuttleTripForm } from "../src/app/shuttle/types";
import { DEPARTURE, LOCATION_GROUPS, PRIVATE_CAR, SEARCH_RESULT } from "./shuttle-fixtures";

const TRIP: ShuttleTripForm = {
  fromId: "", toId: "", date: "2026-10-30", returnDate: "",
  roundTrip: false, largeBags: 0, smallBags: 0,
  paxAdult: 1, paxSenior: 0, paxChild: 0,
};

function root(): HTMLElement {
  const element = document.createElement("div");
  document.body.append(element);
  return element;
}

function TripHarness() {
  const [form, setForm] = useState(TRIP);
  const update = <Key extends keyof ShuttleTripForm>(key: Key, value: ShuttleTripForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  return <ShuttleTrip destinationGroups={LOCATION_GROUPS.slice(1)} errors={{}}
    form={form} formError={null} loadingDestinations={false} loadingLocations={false}
    maximumBags={12} minimumDate="2026-10-23" originGroups={LOCATION_GROUPS}
    submitting={false} onSubmit={() => undefined}
    update={update} />;
}

function renderTrip() {
  const element = root();
  render(<TripHarness />, element);
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
  it("renders grouped locations and the date guard without a timezone line", () => {
    const element = renderTrip();
    act(() => element.querySelector<HTMLInputElement>("#fromId")?.click());
    const groups = [...element.querySelectorAll(".stop-category")];
    expect(groups.map((group) => group.textContent?.trim())).toEqual(["Airports", "Galveston"]);
    expect(element.querySelector<HTMLInputElement>("#toId")?.disabled).toBe(true);
    expect(element.querySelector<HTMLInputElement>("#date")?.min).toBe("2026-10-23");
    expect(element.textContent).not.toContain("Dates and times use America/Chicago");
    expect(element.textContent).toContain("Find Departures");
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
});

describe("shuttle trip layout", () => {
  it("orders locations, dates, party controls, Round trip, and action", () => {
    const form = renderTrip().querySelector<HTMLFormElement>(".shuttle-trip");
    const children = [...(form?.children ?? [])];
    expect(children[0]?.querySelector("#fromId")).not.toBeNull();
    expect(children[0]?.querySelector("#toId")).not.toBeNull();
    expect(children[1]?.querySelector("#date")).not.toBeNull();
    expect(children[1]?.querySelector("#returnDate")).not.toBeNull();
    expect(children[2]?.classList.contains("shuttle-party-fields")).toBe(true);
    expect(children[3]?.classList.contains("trip-kind")).toBe(true);
    expect(children[4]?.textContent).toContain("Find Departures");
  });

  it("keeps the hidden Return Date slot until Round trip is checked", () => {
    const element = renderTrip();
    const checkbox = element.querySelector<HTMLInputElement>('.trip-kind input[type="checkbox"]');
    const returnDate = element.querySelector<HTMLInputElement>("#returnDate");
    expect(checkbox?.checked).toBe(false);
    expect(element.querySelectorAll('.trip-kind input[type="checkbox"]')).toHaveLength(1);
    expect(element.querySelector('.trip-kind input[type="radio"]')).toBeNull();
    expect(returnDate?.disabled).toBe(true);
    expect(returnDate?.required).toBe(false);
    expect(returnDate?.value).toBe("");
    expect(returnDate?.min).toBe(TRIP.date);
    const slot = returnDate?.closest(".return-date-slot");
    expect(slot?.classList.contains("is-hidden")).toBe(true);
    expect(slot?.getAttribute("aria-hidden")).toBe("true");
    expect(element.querySelector(".shuttle-trip-fields")?.children).toHaveLength(2);
    expect(element.querySelector(".shuttle-trip-fields")?.classList.contains("date-time-grid"))
      .toBe(true);
    act(() => element.querySelector<HTMLLabelElement>(".trip-kind")?.click());
    expect(checkbox?.checked).toBe(true);
    expect(returnDate?.disabled).toBe(false);
    expect(returnDate?.required).toBe(true);
    expect(slot?.classList.contains("is-hidden")).toBe(false);
    expect(slot?.getAttribute("aria-hidden")).toBe("false");
    expect(element.querySelector(".shuttle-trip-fields")?.children).toHaveLength(2);
  });

});

describe("shuttle round-trip control", () => {
  it("sends false when Round trip is unchecked", () => {
    const update = vi.fn();
    const element = root();
    render(<ShuttleTrip destinationGroups={LOCATION_GROUPS.slice(1)} errors={{}}
      form={{ ...TRIP, roundTrip: true }} formError={null} loadingDestinations={false}
      loadingLocations={false} maximumBags={12} minimumDate="2026-10-23"
      originGroups={LOCATION_GROUPS}
      submitting={false}
      onSubmit={() => undefined} update={update} />, element);
    act(() => element.querySelector<HTMLLabelElement>('.trip-kind')?.click());
    expect(update).toHaveBeenCalledWith("roundTrip", false);
    expect(element.querySelector<HTMLInputElement>("#returnDate")?.disabled).toBe(false);
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

  it("hides Return Date without removing its grid column", () => {
    const css = readFileSync(resolve("src/styles/shuttle.css"), "utf8");
    expect(css).toMatch(/\.return-date-slot\.is-hidden\s*\{[^}]*visibility:\s*hidden/s);
  });

  it("keeps fixed rows full-width in the 360px container layout", () => {
    const css = readFileSync(resolve("src/styles/shuttle.css"), "utf8");
    expect(css).toMatch(/\.departure-section\s*\{[^}]*width:\s*100%/s);
    expect(css).toMatch(/\.shuttle-departure\.selected\s*\{[^}]*border-color:\s*var\(--blue\)/s);
    expect(css).toMatch(/:is\(\.layout-narrow, \.layout-micro\) \.shuttle-departure\s*\{/s);
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

  it("keeps all three steppers inside the solid popup", () => {
    const element = renderPassengers();
    const popup = element.querySelector(".passenger-menu-solid.passenger-popup-box");
    expect(popup).not.toBeNull();
    const rows = popup?.querySelectorAll(".passenger-row.passenger-popup-row") ?? [];
    const steppers = popup?.querySelectorAll(
      ".counter-controls.passenger-popup-stepper",
    ) ?? [];
    expect(rows).toHaveLength(3);
    expect(steppers).toHaveLength(3);
    for (const stepper of steppers) {
      expect(stepper.querySelectorAll("button")).toHaveLength(2);
      expect(stepper.querySelector("output")).not.toBeNull();
    }
  });

  it("allows Adults to reach zero and updates the closed-state total", () => {
    const element = renderPassengers();
    expect(element.querySelector("#paxAdult")?.textContent).toBe("1");
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Decrease Adults"]')?.disabled)
      .toBe(false);
    act(() => element.querySelector<HTMLButtonElement>('[aria-label="Decrease Adults"]')?.click());
    expect(element.querySelector("#paxAdult")?.textContent).toBe("0");
    act(() => element.querySelector<HTMLButtonElement>('[aria-label="Increase Adults"]')?.click());
    act(() => element.querySelector<HTMLButtonElement>('[aria-label="Increase Adults"]')?.click());
    expect(element.querySelector(".passenger-trigger")?.textContent).toContain("2 passengers");
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
  it("hides the internal route name and shows duration with the public details", () => {
    const hidden = { ...DEPARTURE, schedule_id: "hidden", selectable: false,
      unselectable_reason: "Return must leave later" };
    const element = renderDepartures({ ...SEARCH_RESULT, departures: [DEPARTURE, hidden] });
    expect(element.textContent).toContain("09:30 – 10:30");
    expect(element.textContent).not.toContain("Island Express");
    expect(element.textContent).toContain("60 min");
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
    expect(element.textContent).not.toContain("Island Express");
    expect(element.textContent).toContain("60 min");
    expect(element.textContent).not.toContain("Vehicle:");
  });

  it("shows the server mix total instead of the cheapest seat price", () => {
    const departure = { ...DEPARTURE, total_for_selection: "91.00",
      prices: { adult: "10.00", senior: "12.00", child: "8.00" } };
    const element = renderDepartures({ ...SEARCH_RESULT, departures: [departure] });
    expect(element.textContent).toContain("$91.00 USD");
    expect(element.textContent).not.toContain("$8.00 USD");
  });

  it("shows each round-trip direction's own server price", () => {
    const outbound = { ...DEPARTURE, total_for_selection: "130.00" };
    const returning = { ...DEPARTURE, schedule_id: "return", total_for_selection: "145.00" };
    const element = root();
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

describe("fixed-only shuttle departures", () => {
  it("shows the fixed-departure empty message and ignores any-time cars", () => {
    const privateCar = {
      departure_type: "on_request" as const, route_id: SEARCH_RESULT.route.id,
      vehicle_type_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      vehicle_type_name: "Private Van", seat_capacity: 6, from_price: "150.00",
      image_url: null, customer_note: null, duration_minutes: 60,
      effective_min_passengers: 1, service_mode: "private" as const,
    };
    const element = renderDepartures({ ...SEARCH_RESULT, departures: [],
      on_request: privateCar, on_request_options: [privateCar] });
    expect(element.textContent).toContain(
      "No scheduled departures on this date. Please try another date.",
    );
    expect(element.querySelector('input[type="time"]')).toBeNull();
    expect(element.textContent).not.toContain("Private Van");
    expect(element.textContent).not.toContain("Or pick your own time");
  });

  it("renders no pickup-time input for either round-trip leg", () => {
    const result = { ...SEARCH_RESULT, departures: [DEPARTURE] };
    const element = root();
    render(<ShuttleDepartures currency="USD" notice={null} loadingOutbound={false}
      outboundData={{ result, date: "2026-11-04", direction: "outbound" }}
      returnData={{ result, date: "2026-11-07", direction: "return" }} loadingReturn={false}
      passengerCount={1} selectedOutbound={null} selectedReturn={null}
      onBack={() => undefined} onChooseOutbound={() => undefined}
      onChooseReturn={() => undefined} />, element);
    expect(element.querySelectorAll('input[type="time"]')).toHaveLength(0);
    expect(element.textContent).toContain("Choose Departure · Wed, Nov 4");
    expect(element.textContent).toContain("Choose Return · Sat, Nov 7");
  });
});

describe("date-only private shuttle cars", () => {
  it("shows a private row on its date without a time field", () => {
    const onChoose = vi.fn();
    const car = { ...PRIVATE_CAR, service_date: "2026-12-25" };
    const element = renderDepartures(
      { ...SEARCH_RESULT, departures: [], private_cars: [car] }, "outbound", onChoose,
    );
    expect(element.textContent).toContain("Private SUV");
    expect(element.textContent).toContain("Private");
    expect(element.textContent).toContain("Up to 5 passengers");
    expect(element.textContent).toContain("Pickup time will be arranged by phone");
    expect(element.textContent).toContain("$165.00 USD");
    expect(element.querySelector('input[type="time"]')).toBeNull();
    act(() => element.querySelector<HTMLButtonElement>(".shuttle-departure.private button")?.click());
    expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({
      kind: "private", date: "2026-12-25", car,
    }));
  });
});

describe("return shuttle departures", () => {
  it("renders the server reason for an unselectable return without calculating chronology", () => {
    const reason = "This departure leaves before your outbound trip arrives.";
    const unavailable = { ...DEPARTURE, selectable: false, unselectable_reason: reason };
    const element = renderDepartures({ ...SEARCH_RESULT, departures: [unavailable] }, "return");
    expect(element.textContent).toContain(reason);
    expect(element.querySelector<HTMLButtonElement>(".departure-section.return button")?.disabled)
      .toBe(true);
  });
});
