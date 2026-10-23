import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

import type { ShuttleSearchResult } from "../src/api/client";
import { ShuttleDepartures } from "../src/app/shuttle/Departures";
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

function renderTrip(priceFlags = { senior: false, child: false }) {
  const element = root();
  render(<ShuttleTrip destinationGroups={LOCATION_GROUPS.slice(1)} errors={{}}
    form={TRIP} formError={null} loadingDestinations={false} loadingLocations={false}
    minimumDate="2026-10-23" originGroups={LOCATION_GROUPS} priceFlags={priceFlags}
    submitting={false} timeZone="America/Chicago" onSubmit={() => undefined}
    update={() => undefined} />, element);
  return element;
}

function renderDepartures(result: ShuttleSearchResult, direction: "outbound" | "return" = "outbound") {
  const element = root();
  render(<ShuttleDepartures currency="USD" notice={null}
    data={{ result, date: "2026-10-30", direction }}
    onBack={() => undefined} onChoose={() => undefined} />, element);
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

  it("shows senior and child controls only when separate prices are returned", () => {
    expect(renderTrip().querySelector("#paxSenior")).toBeNull();
    const priced = renderTrip({ senior: true, child: true });
    expect(priced.querySelector("#paxSenior")).not.toBeNull();
    expect(priced.querySelector("#paxChild")).not.toBeNull();
  });
});

describe("shuttle departures", () => {
  it("shows time, service label, seats and server price without a car name", () => {
    const hidden = { ...DEPARTURE, schedule_id: "hidden", selectable: false,
      unselectable_reason: "Return must leave later" };
    const element = renderDepartures({ ...SEARCH_RESULT, departures: [DEPARTURE, hidden] });
    expect(element.textContent).toContain("09:30 – 10:30");
    expect(element.textContent).toContain("Island Express");
    expect(element.textContent).toContain("4 seats left");
    expect(element.textContent).toContain("$70.50 USD");
    expect(element.textContent).not.toContain("Return must leave later");
    expect(element.querySelectorAll(".shuttle-departure")).toHaveLength(1);
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
    expect(element.querySelector<HTMLButtonElement>(".shuttle-departure button")?.disabled).toBe(true);
  });

  it("shows the API vehicle type name for an on-request route", () => {
    const result = { ...SEARCH_RESULT, departures: [], on_request: {
      departure_type: "on_request" as const,
      route_id: SEARCH_RESULT.route.id,
      vehicle_type_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      vehicle_type_name: "Executive Van",
      seat_capacity: 8,
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
});
