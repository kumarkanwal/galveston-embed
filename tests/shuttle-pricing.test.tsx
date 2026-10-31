import { render } from "preact";
import { describe, expect, it } from "vitest";

import type { OnRequestAvailability } from "../src/api/client";
import { ShuttleDepartures } from "../src/app/shuttle/Departures";
import { pricingText, tierRule } from "../src/app/shuttle/pricing";
import { SEARCH_RESULT } from "./shuttle-fixtures";

const TIERS = [
  { min_passengers: 1, max_passengers: 1, price_type: "total", amount: "50.00" },
  { min_passengers: 2, max_passengers: null, price_type: "per_person", amount: "25.00" },
] as const;

function option(total: string, fixed = false): OnRequestAvailability {
  return {
    departure_type: "on_request", route_id: SEARCH_RESULT.route.id,
    vehicle_type_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    vehicle_type_name: fixed ? "Private Van" : "Tier Van",
    seat_capacity: fixed ? 6 : 8, from_price: total, effective_min_passengers: 1,
    service_mode: fixed ? "private" : "shared",
    pricing: fixed
      ? { mode: "fixed_vehicle", tiers: [], fixed_price: "150.00" }
      : { mode: "tiered", fixed_price: null, tiers: [...TIERS] },
  };
}

function renderOption(value: OnRequestAvailability): HTMLElement {
  const element = document.createElement("div");
  const result = { ...SEARCH_RESULT, departures: [], on_request: null,
    on_request_options: [value] };
  render(<ShuttleDepartures currency="USD" notice={null} loadingOutbound={false}
    outboundData={{ result, date: "2026-10-30", direction: "outbound" }} returnData={null}
    loadingReturn={false} passengerCount={1} onBack={() => undefined}
    onChooseOutbound={() => undefined} onChooseReturn={() => undefined}
    onDateChange={() => undefined} />, element);
  return element;
}

describe("shuttle pricing presentation", () => {
  it("keeps tier order and amount meaning from the API", () => {
    expect(tierRule({ mode: "tiered", fixed_price: null, tiers: [...TIERS] }, "USD")).toBe(
      "1 passenger $50.00 USD total · 2+ passengers $25.00 USD each",
    );
  });

  it.each([[1, "50.00"], [2, "50.00"], [3, "75.00"], [4, "100.00"]])(
    "shows the server live tier total for %i passengers",
    (_passengers, total) => {
      const element = renderOption(option(total));
      expect(element.textContent).toContain("1 passenger $50.00 USD total");
      expect(element.textContent).toContain("2+ passengers $25.00 USD each");
      expect(element.textContent).toContain(`Live total: $${total} USD`);
    },
  );

  it("shows a fixed price per vehicle with capacity", () => {
    expect(renderOption(option("150.00", true)).textContent)
      .toContain("$150.00 USD per vehicle (up to 6 passengers)");
  });

  it("uses the server live total without client money arithmetic", () => {
    expect(pricingText(option("100.00"), "USD")).toContain("Live total: $100.00 USD");
  });
});
