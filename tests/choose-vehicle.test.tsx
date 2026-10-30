import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Business, QuotedVehicle, TaxiQuoteResponse } from "../src/api/client";
import { ChooseVehicle } from "../src/app/vehicle/ChooseVehicle";

const BUSINESS = {
  id: "business-1",
  name: "Island Transit",
  type: "taxi",
  currency: "USD",
  timezone: "America/Chicago",
  distance_unit: "miles",
  emails_enabled: false,
  max_passengers: 20,
  max_luggage: 20,
  settings: {
    advance_booking_hours: 0,
    car_seat_price: "15.00",
    insurance_enabled: false,
    insurance_pct: "0.00",
    max_car_seats: 5,
    offer_car_seats: true,
    payment_methods: ["cash"],
    show_map: true,
    show_service_dropdown: true,
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
    notice={null} onBack={() => undefined} onChoose={onChoose} />, root);
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
    expect(buttons.map((button) => button.textContent)).toEqual(["Choose", "Choose"]);
    expect(buttons.map((button) => button.getAttribute("aria-label")))
      .toEqual(["Choose Sedan", "Choose Van"]);
    expect(root.querySelector(".vehicle-unavailable")?.textContent)
      .toBe("Not available at this time");
    expect(root.textContent?.match(/Not available at this time/g)).toHaveLength(1);
    expect(root.querySelector("[aria-disabled='true'] .vehicle-choose")).toBeNull();
    expect(root.querySelector(".vehicle-capacity")?.textContent).toBe("♟ 3 passengers· ▣ 2 bags");
    buttons[0]?.click();
    expect(onChoose).toHaveBeenCalledWith(VEHICLES[0]);
  });

  it("moves focus to the step heading when navigation opens the step", async () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const root = document.createElement("div");
    document.body.append(root);
    act(() => render(<ChooseVehicle autoFocusHeading business={BUSINESS}
      quote={{ out_of_service_area: false, vehicles: VEHICLES }}
      notice={null} onBack={() => undefined} onChoose={() => undefined} />, root));
    const heading = root.querySelector(".step-title");
    await vi.waitFor(() => expect(focus).toHaveBeenCalled());
    expect(focus.mock.instances).toContain(heading);
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

});

describe("Booking-time vehicle availability", () => {
  it("shows a notice with next-step guidance", () => {
    const { root } = mountQuote({ out_of_service_area: false, vehicles: VEHICLES });
    render(<ChooseVehicle business={BUSINESS} quote={{ out_of_service_area: false, vehicles: VEHICLES }}
      notice="No vehicle is available for the requested time."
      onBack={() => undefined} onChoose={() => undefined} />, root);
    expect(root.querySelector('[role="alert"]')?.textContent)
      .toContain("Choose another vehicle, or go back to select another time.");
  });
});

describe("Server-owned vehicle availability", () => {
  it("shows a server-owned luggage-capacity unavailable row", () => {
    const vehicle = { ...VEHICLES[0]!, available: false, quote_status: "unavailable",
      unavailable_reason: "capacity" } satisfies QuotedVehicle;
    const { root } = mountQuote({ out_of_service_area: false, vehicles: [vehicle] });
    expect(root.querySelector(".vehicle-choose")).toBeNull();
    expect(root.querySelector(".vehicle-unavailable")?.textContent)
      .toBe("Too many passengers or bags for this vehicle");
  });

  it.each([
    ["blackout", "Not available at this time"],
    ["time", "Not available at this time"],
    ["admin_disabled", "Not available"],
    [undefined, "Not available at this time"],
  ])("maps %s to one plain unavailable message", (reason, message) => {
    const unavailable = { ...VEHICLES[0]!, available: false,
      quote_status: "unavailable" as const };
    const vehicle: QuotedVehicle = reason === undefined
      ? unavailable
      : { ...unavailable, unavailable_reason: reason };
    const { root } = mountQuote({ out_of_service_area: false, vehicles: [vehicle] });
    expect(root.querySelector(".vehicle-unavailable")?.textContent).toBe(message);
    expect(root.textContent?.match(new RegExp(message, "g"))).toHaveLength(1);
    expect(root.querySelector(".vehicle-choose")).toBeNull();
  });
});

describe("Vehicle photos", () => {
  it("renders only HTTPS photos with lazy loading and the exact vehicle-name alt", () => {
    const vehicle = {
      ...VEHICLES[0]!, photo_url: "https://images.example/sedan.png",
    } satisfies QuotedVehicle;
    const { root } = mountQuote({ out_of_service_area: false, vehicles: [vehicle] });
    const image = root.querySelector<HTMLImageElement>(".vehicle-photo");
    expect(image?.getAttribute("src")).toBe(vehicle.photo_url);
    expect(image?.getAttribute("alt")).toBe(vehicle.name);
    expect(image?.getAttribute("loading")).toBe("lazy");
    expect(image?.getAttribute("width")).toBe("110");
    expect(image?.getAttribute("height")).toBe("70");
  });

  it("shows the SVG placeholder for null, missing, HTTP, and malformed photo URLs", () => {
    const vehicles: QuotedVehicle[] = [
      { ...VEHICLES[0]!, vehicle_type_id: "null", name: "Null", photo_url: null },
      { ...VEHICLES[0]!, vehicle_type_id: "missing", name: "Missing" },
      { ...VEHICLES[0]!, vehicle_type_id: "http", name: "HTTP",
        photo_url: "http://images.example/van.png" },
      { ...VEHICLES[0]!, vehicle_type_id: "malformed", name: "Malformed", photo_url: "not a URL" },
    ];
    const { root } = mountQuote({ out_of_service_area: false, vehicles });
    expect(root.querySelectorAll(".vehicle-photo")).toHaveLength(0);
    expect(root.querySelectorAll(".vehicle-photo-placeholder")).toHaveLength(4);
    expect(root.querySelectorAll(".vehicle-placeholder-icon")).toHaveLength(4);
  });

  it("replaces a failed HTTPS image with the same-size placeholder", () => {
    const vehicle = {
      ...VEHICLES[0]!, photo_url: "https://images.example/missing.png",
    } satisfies QuotedVehicle;
    const { root } = mountQuote({ out_of_service_area: false, vehicles: [vehicle] });
    const image = root.querySelector<HTMLImageElement>(".vehicle-photo");
    expect(image).not.toBeNull();
    act(() => { image?.dispatchEvent(new Event("error")); });
    const placeholder = root.querySelector(".vehicle-photo-placeholder");
    expect(root.querySelector(".vehicle-photo")).toBeNull();
    expect(placeholder?.classList.contains("vehicle-photo-frame")).toBe(true);
    expect(placeholder?.getAttribute("aria-label")).toBe("Sedan image unavailable");
  });
});
