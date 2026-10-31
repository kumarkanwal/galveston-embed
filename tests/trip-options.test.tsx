import { render } from "preact";
import { useState } from "preact/hooks";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient, Business, ServiceTypeOption } from "../src/api/client";
import { BookingFlow } from "../src/app/shell/BookingFlow";
import { LuggageCounters } from "../src/app/trip/LuggageCounters";
import type { TripFormState } from "../src/app/trip/types";

const BUSINESS = {
  id: "business-1", name: "Island Transit", type: "taxi", currency: "USD",
  timezone: "America/Chicago", distance_unit: "miles", emails_enabled: false,
  max_passengers: 10, max_luggage: 8,
  settings: { advance_booking_hours: 0, insurance_enabled: false, insurance_pct: "0.00",
    offer_car_seats: true, max_car_seats: 5, car_seat_price: "15.00",
    payment_methods: ["cash"], show_map: false, show_service_dropdown: true },
} satisfies Business;

const SERVICES: ServiceTypeOption[] = [
  { id: "round", code: "round_trip", name: "Round Trip" },
  { id: "pickup", code: "airport_pickup", name: "Airport Pickup" },
  { id: "one", code: "one_way", name: "One Way" },
];

function client(): ApiClient {
  return { getBusiness: vi.fn(), getServiceTypes: vi.fn(),
    getAirports: vi.fn(async () => [{ id: "airport", name: "IAH", code: "IAH",
      address: "2800 N Terminal Rd", zipcode: "77032" }]),
    getAirlines: vi.fn(async () => [{ id: "airline", name: "Example Air" }]),
    quote: vi.fn(), priceBreakdown: vi.fn(), book: vi.fn() };
}

function mount(settings: Partial<Business["settings"]>, services = SERVICES) {
  const root = document.createElement("div");
  document.body.append(root);
  const business = { ...BUSINESS, settings: { ...BUSINESS.settings, ...settings } };
  render(<BookingFlow business={business} client={client()} mapsKey="maps" services={services} />, root);
  return root;
}

const COUNTER_FORM: TripFormState = {
  service: "one_way", pickupDate: "2026-10-22", pickupTime: "10:00",
  returnDate: "2026-10-23", returnTime: "10:00", passengers: 1,
  largeBags: 0, smallBags: 0, pickupAddress: null, dropoffAddress: null,
  pickupAirportId: "", pickupAirportName: "", pickupAirportLocation: null,
  dropoffAirportId: "", dropoffAirportName: "", dropoffAirportLocation: null,
  airline: null, flightNumber: "",
};

function CounterHarness() {
  const [form, setForm] = useState(COUNTER_FORM);
  const update = <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  return <LuggageCounters errors={{}} form={form} maximum={2}
    onFieldBlur={() => undefined} update={update} />;
}

beforeEach(() => document.body.replaceChildren());

describe("taxi responsive field groups", () => {
  it("groups taxi date/time and party controls in responsive ordered rows", () => {
    const root = mount({ show_service_dropdown: true }, [SERVICES[2]!]);
    expect([...root.querySelectorAll(".pickup-datetime-fields > .field")]
      .map((field) => field.getAttribute("data-trip-field")))
      .toEqual(["pickupDate", "pickupTime"]);
    expect([...root.querySelectorAll(".party-fields > .field")]
      .map((field) => field.getAttribute("data-trip-field")))
      .toEqual(["passengers", "largeBags", "smallBags"]);
    expect(root.querySelector(".pickup-datetime-fields")?.classList.contains("compact-row"))
      .toBe(true);
    expect(root.querySelector(".party-fields")?.classList.contains("compact-row")).toBe(true);
    expect([...root.querySelectorAll(".bag-label span")].map((label) => label.textContent))
      .toEqual(["Bags", "Carry-on"]);
    expect(root.querySelector("#largeBags")?.getAttribute("aria-label"))
      .toBe("Check-in / trunk bags");
    expect(root.querySelector(".party-fields .bag-icon")).not.toBeNull();
  });
});

describe("taxi aligned field layout", () => {
  it("uses the shared date/time grid for pickup and return rows", () => {
    const root = mount({ show_service_dropdown: true });
    expect(root.querySelector(".pickup-datetime-fields")?.classList.contains("date-time-grid"))
      .toBe(true);
    expect(root.querySelector(".return-fields")?.classList.contains("date-time-grid"))
      .toBe(true);
  });

  it("keeps the complete ten-passenger label in the native select", () => {
    const root = mount({ show_service_dropdown: true }, [SERVICES[2]!]);
    expect(root.querySelector("#passengers option:last-child")?.textContent?.trim())
      .toBe("10 passengers");
  });
});

describe("business form toggles", () => {
  it("renders non-focusable decorative map pins beside taxi addresses", () => {
    const root = mount({ show_service_dropdown: true }, [SERVICES[2]!]);
    const pins = [...root.querySelectorAll<HTMLElement>(".address-pin")];
    expect(pins).toHaveLength(2);
    for (const pin of pins) {
      expect(pin.tagName).toBe("SPAN");
      expect(pin.getAttribute("aria-hidden")).toBe("true");
      expect(pin.getAttribute("tabindex")).toBeNull();
      expect(pin.querySelector("svg")).not.toBeNull();
    }
    expect(root.querySelector("button.address-pin")).toBeNull();
  });

  it("shows the API-ordered service dropdown including round trip", () => {
    const root = mount({ show_service_dropdown: true });
    const options = [...root.querySelectorAll<HTMLOptionElement>("#service option")];
    expect(options.map((option) => option.value)).toEqual([
      "round_trip", "airport_pickup", "one_way",
    ]);
    expect(root.querySelector(".trip-kind-toggle")).toBeNull();
  });

  it("uses the first non-round service and switches round trip when the dropdown is hidden", async () => {
    const root = mount({ show_service_dropdown: false });
    expect(root.querySelector("#service")).toBeNull();
    await vi.waitFor(() => expect(root.querySelector("#airport")).not.toBeNull());
    act(() => root.querySelector<HTMLButtonElement>("[aria-pressed='false']")?.click());
    await vi.waitFor(() => expect(root.querySelector("#return-date")).not.toBeNull());
    expect(root.querySelector("#pickup-address")).not.toBeNull();
    const oneWay = [...root.querySelectorAll<HTMLButtonElement>(".trip-kind-toggle button")]
      .find((button) => button.textContent === "One way");
    oneWay?.click();
    await vi.waitFor(() => expect(root.querySelector("#airport")).not.toBeNull());
  });

  it("fails closed when hidden mode has no permitted non-round-trip service", () => {
    const root = mount({ show_service_dropdown: false }, [SERVICES[0]!]);
    expect(root.textContent).toContain("Online booking is not available. Please contact us.");
  });

  it("hides only the map when show_map is false", async () => {
    const mapSelector = ".map-panel, [data-testid='map']";
    expect(mount({ show_map: false }).querySelector(mapSelector)).toBeNull();
    const shown = mount({ show_map: true });
    await vi.waitFor(() => expect(shown.querySelector(mapSelector)).not.toBeNull());
  });
});

describe("taxi select arrows", () => {
  it("keeps native selects with the shared field chevron", () => {
    const root = mount({ show_service_dropdown: true });
    for (const id of ["service", "passengers"]) {
      const select = root.querySelector<HTMLSelectElement>(`#${id}`);
      expect(select?.tagName).toBe("SELECT");
      expect(select?.closest(".select-control")
        ?.querySelector(".field-chevron svg")).not.toBeNull();
    }
  });
});

describe("split luggage counters", () => {
  it("uses accessible counters, stops at the combined maximum, and never goes below zero", async () => {
    const root = document.createElement("div");
    render(<CounterHarness />, root);
    const increaseLarge = root.querySelector<HTMLButtonElement>(
      "[aria-label='Increase Check-in / trunk bags']",
    );
    const increaseSmall = root.querySelector<HTMLButtonElement>("[aria-label='Increase Carry-on bags']");
    act(() => { increaseLarge?.click(); increaseSmall?.click(); });
    await vi.waitFor(() => expect(increaseLarge?.disabled).toBe(true));
    expect(increaseSmall?.disabled).toBe(true);
    const decreaseLarge = root.querySelector<HTMLButtonElement>(
      "[aria-label='Decrease Check-in / trunk bags']",
    );
    act(() => { decreaseLarge?.click(); decreaseLarge?.click(); });
    await vi.waitFor(() => expect(decreaseLarge?.disabled).toBe(true));
  });
});
