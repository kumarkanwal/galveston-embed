import { render } from "preact";
import { act } from "preact/test-utils";
import { useState } from "preact/hooks";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShuttleSearchResult } from "../src/api/client";
import { ShuttleDepartures } from "../src/app/shuttle/Departures";
import { PassengerDropdown } from "../src/app/shuttle/PassengerDropdown";
import { ShuttleTrip } from "../src/app/shuttle/Trip";
import type { ShuttleTripForm } from "../src/app/shuttle/types";
import { DEPARTURE, LOCATION_GROUPS, SEARCH_RESULT } from "./shuttle-fixtures";

const TRIP: ShuttleTripForm = {
  fromId: "", toId: "", date: "2026-10-30", returnDate: "2026-11-01",
  roundTrip: false, paxAdult: 1, paxSenior: 0, paxChild: 0,
};

function root(): HTMLElement {
  const element = document.createElement("div");
  document.body.append(element);
  return element;
}

function renderTrip() {
  const element = root();
  render(<ShuttleTrip destinationGroups={LOCATION_GROUPS.slice(1)} errors={{}}
    form={TRIP} formError={null} loadingDestinations={false} loadingLocations={false}
    minimumDate="2026-10-23" originGroups={LOCATION_GROUPS}
    submitting={false} timeZone="America/Chicago" onSubmit={() => undefined}
    update={() => undefined} />, element);
  return element;
}

function renderDepartures(result: ShuttleSearchResult, direction: "outbound" | "return" = "outbound") {
  const element = root();
  render(<ShuttleDepartures currency="USD" notice={null} loadingOutbound={false}
    outboundData={{ result: direction === "outbound" ? result
      : { ...SEARCH_RESULT, departures: [] }, date: "2026-10-30", direction: "outbound" }}
    returnData={direction === "return" ? { result, date: "2026-10-30", direction } : null}
    loadingReturn={false} passengerCount={1} onBack={() => undefined}
    onChooseOutbound={() => undefined} onChooseReturn={() => undefined}
    onDateChange={() => undefined} />, element);
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
    const groups = [...element.querySelectorAll("#fromId optgroup")];
    expect(groups.map((group) => group.getAttribute("label"))).toEqual(["Airports", "Galveston"]);
    expect(element.querySelectorAll("#toId option")).toHaveLength(2);
    expect(element.querySelector<HTMLInputElement>("#date")?.min).toBe("2026-10-23");
    expect(element.textContent).toContain("Dates and times use America/Chicago");
  });

  it("shows adult, senior and child controls before the first search", () => {
    const unpriced = renderTrip();
    act(() => unpriced.querySelector<HTMLButtonElement>(".passenger-trigger")?.click());
    expect(unpriced.querySelector("#paxAdult")?.textContent).toBe("1");
    expect(unpriced.querySelector("#paxSenior")?.textContent).toBe("0");
    expect(unpriced.querySelector("#paxChild")?.textContent).toBe("0");
  });

  it("uses one unchecked Round trip checkbox and no trip-type radios", () => {
    const element = renderTrip();
    const checkbox = element.querySelector<HTMLInputElement>('.trip-kind input[type="checkbox"]');
    expect(checkbox?.checked).toBe(false);
    expect(element.querySelectorAll('.trip-kind input[type="checkbox"]')).toHaveLength(1);
    expect(element.querySelector('.trip-kind input[type="radio"]')).toBeNull();
    expect(element.querySelector("#returnDate")).toBeNull();
  });

  it("sends false when Round trip is unchecked", () => {
    const update = vi.fn();
    const element = root();
    render(<ShuttleTrip destinationGroups={LOCATION_GROUPS.slice(1)} errors={{}}
      form={{ ...TRIP, roundTrip: true }} formError={null} loadingDestinations={false}
      loadingLocations={false} minimumDate="2026-10-23" originGroups={LOCATION_GROUPS}
      submitting={false}
      timeZone="America/Chicago" onSubmit={() => undefined} update={update} />, element);
    act(() => element.querySelector<HTMLInputElement>('.trip-kind input')?.click());
    expect(update).toHaveBeenCalledWith("roundTrip", false);
  });
});

describe("shuttle passenger dropdown", () => {
  it("defaults to one adult and updates the closed-state total", () => {
    const element = renderPassengers();
    expect(element.querySelector("#paxAdult")?.textContent).toBe("1");
    expect(element.querySelector<HTMLButtonElement>('[aria-label="Decrease Adults"]')?.disabled)
      .toBe(true);
    act(() => element.querySelector<HTMLButtonElement>('[aria-label="Increase Adults"]')?.click());
    act(() => element.querySelector<HTMLButtonElement>('[aria-label="Increase Adults"]')?.click());
    expect(element.querySelector(".passenger-trigger")?.textContent).toContain("3 passengers");
  });

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
    expect(element.textContent).toContain("Shared Shuttle");
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

describe("on-request shuttle departures", () => {
  it("shows the API vehicle type name for an on-request route", () => {
    const result = { ...SEARCH_RESULT, departures: [], on_request: {
      departure_type: "on_request" as const,
      route_id: SEARCH_RESULT.route.id,
      vehicle_type_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      vehicle_type_name: "Executive Van",
      seat_capacity: 8,
      from_price: "38.50",
      effective_min_passengers: 1,
      service_mode: "shared" as const,
      earliest_pickup_date: "2026-10-30",
      earliest_pickup_time: "11:00",
    } };
    const element = renderDepartures(result);
    expect(element.textContent).toContain("Vehicle: Executive Van");
    const picker = element.querySelector<HTMLInputElement>('input[type="time"]');
    expect(picker?.min).toBe("11:00");
    act(() => {
      if (picker !== null) picker.value = "10:30";
      picker?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(element.textContent).toContain("Choose a time at or after 11:00");
    expect(element.querySelector<HTMLButtonElement>(".on-request-choice button")?.disabled).toBe(true);
  });

  it("labels private service and shows date and time without scheduled departures", () => {
    const result = { ...SEARCH_RESULT, departures: [DEPARTURE], on_request: {
      departure_type: "on_request" as const,
      route_id: SEARCH_RESULT.route.id,
      vehicle_type_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      vehicle_type_name: "Private Van",
      seat_capacity: 8,
      from_price: "150.00",
      effective_min_passengers: 1,
      service_mode: "private" as const,
      earliest_pickup_date: "2026-10-30",
      earliest_pickup_time: "11:00",
    } };
    const element = renderDepartures(result);
    expect(element.textContent).toContain("Private Shuttle");
    expect(element.textContent).toContain("Private vehicle for your group");
    expect(element.querySelector<HTMLInputElement>('[data-shuttle-date="outbound"]')?.type)
      .toBe("date");
    expect(element.querySelector<HTMLInputElement>('[data-shuttle-time="outbound"]')?.type)
      .toBe("time");
  });
});
