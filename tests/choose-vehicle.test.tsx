import { render } from "preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Business, QuotedVehicle, TaxiQuoteResponse } from "../src/api/client";
import { ConfirmPlaceholder } from "../src/app/confirm/ConfirmPlaceholder";
import { ChooseVehicle } from "../src/app/vehicle/ChooseVehicle";

const BUSINESS = {
  id: "business-1",
  name: "Island Transit",
  type: "taxi",
  currency: "USD",
  timezone: "America/Chicago",
  distance_unit: "miles",
  settings: {
    advance_booking_hours: 0,
    insurance_enabled: false,
    insurance_pct: "0.00",
    payment_methods: ["cash"],
  },
} satisfies Business;

const VEHICLES: QuotedVehicle[] = [
  { vehicle_type_id: "priced", name: "Sedan", passenger_capacity: 3,
    luggage_capacity: 2, base_price: "1413.75", available: true, quote_status: "priced" },
  { vehicle_type_id: "manual", name: "Van", passenger_capacity: 8,
    luggage_capacity: 8, available: true, quote_status: "request_quote" },
  { vehicle_type_id: "blocked", name: "Bus", passenger_capacity: 20,
    luggage_capacity: 20, base_price: "900.00", available: false,
    quote_status: "unavailable", unavailable_reason: "blackout" },
];

function mountQuote(quote: TaxiQuoteResponse, onChoose = vi.fn()) {
  const root = document.createElement("div");
  document.body.append(root);
  render(<ChooseVehicle business={BUSINESS} quote={quote}
    onBack={() => undefined} onChoose={onChoose} />, root);
  return { onChoose, root };
}

beforeEach(() => document.body.replaceChildren());

describe("Choose Vehicle", () => {
  it("renders API order and all three quote states", () => {
    const { root, onChoose } = mountQuote({ out_of_service_area: false, vehicles: VEHICLES });
    expect([...root.querySelectorAll("h3")].map((node) => node.textContent))
      .toEqual(["Sedan", "Van", "Bus"]);
    expect(root.textContent).toContain("$1,413.75 USD");
    expect(root.textContent).toContain("Request a Quote");
    const buttons = [...root.querySelectorAll<HTMLButtonElement>(".vehicle-choose")];
    expect(buttons.map((button) => button.textContent)).toEqual(["Choose", "Choose", "Unavailable"]);
    expect(buttons[2]?.disabled).toBe(true);
    buttons[0]?.click();
    expect(onChoose).toHaveBeenCalledWith(VEHICLES[0]);
  });

  it("shows the out-of-area notice and still lists vehicles", () => {
    const { root } = mountQuote({ out_of_service_area: true, vehicles: VEHICLES });
    expect(root.textContent).toContain("outside our standard service area");
    expect(root.querySelectorAll(".vehicle-row")).toHaveLength(3);
  });

  it("shows the empty result with Back", () => {
    const { root } = mountQuote({ out_of_service_area: false, vehicles: [] });
    expect(root.textContent).toContain("No vehicles are available for this trip");
    expect(root.querySelector(".back-button")).not.toBeNull();
  });

  it("renders the E-3 confirm placeholder", () => {
    const root = document.createElement("div");
    render(<ConfirmPlaceholder vehicle={VEHICLES[0] as QuotedVehicle}
      onBack={() => undefined} />, root);
    expect(root.textContent).toContain("Sedan");
    expect(root.textContent).toContain("Confirm — coming next");
    expect(root.querySelector('[aria-current="step"]')?.textContent).toContain("Confirm");
  });
});
