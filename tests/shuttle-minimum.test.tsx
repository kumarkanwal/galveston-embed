import { render } from "preact";
import { describe, expect, it } from "vitest";

import type { ShuttleSearchResult } from "../src/api/client";
import { ApiError } from "../src/api/errors";
import { ShuttleDepartures } from "../src/app/shuttle/Departures";
import { minimumPassengerError } from "../src/app/shuttle/minimum";
import { DEPARTURE, SEARCH_RESULT } from "./shuttle-fixtures";

function renderResult(result: ShuttleSearchResult, passengers: number): HTMLElement {
  const element = document.createElement("div");
  render(<ShuttleDepartures currency="USD" notice={null} loadingOutbound={false}
    outboundData={{ result, date: "2026-10-30", direction: "outbound" }} returnData={null}
    loadingReturn={false} passengerCount={passengers} onBack={() => undefined}
    onChooseOutbound={() => undefined} onChooseReturn={() => undefined}
    onDateChange={() => undefined} />, element);
  return element;
}

describe("shuttle passenger limits", () => {
  it("shows the effective date minimum and blocks Continue", () => {
    const departure = { ...DEPARTURE, effective_min_passengers: 3 };
    const element = renderResult({ ...SEARCH_RESULT, departures: [departure] }, 2);
    expect(element.textContent).toContain("Minimum 3 passengers for this date");
    expect(element.querySelector<HTMLButtonElement>(".shuttle-departure button")?.disabled)
      .toBe(true);
  });

  it("blocks a private group above vehicle capacity", () => {
    const option = {
      departure_type: "on_request" as const, route_id: SEARCH_RESULT.route.id,
      vehicle_type_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      vehicle_type_name: "Private Van", seat_capacity: 4, from_price: "150.00",
      effective_min_passengers: 1, service_mode: "private" as const,
      pricing: { mode: "fixed_vehicle" as const, tiers: [], fixed_price: "150.00" },
    };
    const element = renderResult({ ...SEARCH_RESULT, departures: [], on_request: null,
      on_request_options: [option] }, 5);
    expect(element.textContent).toContain("This vehicle allows up to 4 passengers.");
    expect(element.querySelector<HTMLButtonElement>(".on-request-choice button")?.disabled)
      .toBe(true);
  });

  it("uses the server minimum error message with a safe fallback", () => {
    expect(minimumPassengerError(new ApiError(422, {
      code: "MIN_PASSENGERS_NOT_MET", message: "At least 3 passengers are required.",
    }))).toBe("At least 3 passengers are required.");
    expect(minimumPassengerError(new ApiError(422, {
      code: "MIN_PASSENGERS_NOT_MET", message: "",
    }))).toBe("This trip does not meet the minimum passenger requirement.");
    expect(minimumPassengerError(new Error("other"))).toBeNull();
  });
});
