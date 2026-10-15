import { render } from "preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient, Airline, Airport } from "../src/api/client";
import { createApiClient } from "../src/api/client";
import { TripDetails } from "../src/app/trip/TripDetails";
import { comboboxOptionId } from "../src/app/trip/combobox-a11y";
import type { CoreServiceCode, TripErrors, TripFormState } from "../src/app/trip/types";

const AIRPORTS: Airport[] = [{ id: "airport-1", name: "George Bush", code: "IAH" }];
const AIRLINES: Airline[] = [{ id: "airline-1", name: "Example Air" }];
const SERVICES = [
  { id: "pickup", code: "airport_pickup", name: "Airport Pickup" },
  { id: "dropoff", code: "airport_dropoff", name: "Airport Dropoff" },
] as const;

function formFor(service: CoreServiceCode): TripFormState {
  return {
    service,
    pickupDate: "2026-10-20",
    pickupTime: "10:00",
    passengers: 1,
    luggage: 0,
    pickupAddress: null,
    dropoffAddress: null,
    pickupAirportId: "",
    pickupAirportName: "",
    pickupAirportLocation: null,
    dropoffAirportId: "",
    dropoffAirportName: "",
    dropoffAirportLocation: null,
    airline: null,
    flightNumber: "",
  };
}

function mockClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getBusiness: vi.fn(),
    getServiceTypes: vi.fn(async () => []),
    getAirports: vi.fn(async () => AIRPORTS),
    getAirlines: vi.fn(async () => AIRLINES),
    quote: vi.fn(async () => ({ out_of_service_area: false, vehicles: [] })),
    priceBreakdown: vi.fn(async () => ({
      subtotal: "0.00", discount_amount: "0.00", total: "0.00", currency: "USD",
    })),
    book: vi.fn(),
    ...overrides,
  };
}

function renderTrip(
  service: CoreServiceCode,
  client: ApiClient,
  isSubmitting = false,
  errors: TripErrors = {},
  autoFocusHeading = false,
): HTMLElement {
  const root = document.createElement("div");
  document.body.append(root);
  render(<TripDetails autoFocusHeading={autoFocusHeading}
    client={client} errors={errors} form={formFor(service)} formError={null}
    isSubmitting={isSubmitting} limits={{ passengers: 8, luggage: 8 }} mapsKey=""
    onFieldBlur={() => undefined} onSubmit={() => undefined} routePolyline={null}
    services={[...SERVICES]} timeZone="America/Chicago" update={() => undefined} />, root);
  return root;
}

function labels(root: HTMLElement): string[] {
  return [...root.querySelectorAll("label")].map((label) => label.textContent ?? "");
}

function expectOrder(actual: string[], expected: string[]) {
  const positions = expected.map((label) => actual.indexOf(label));
  expect(positions.every((position) => position >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((left, right) => left - right));
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe("trip step accessibility", () => {
  it("moves focus to the heading without making the whole step live", async () => {
    const root = renderTrip("airport_pickup", mockClient(), false, {}, true);
    await vi.waitFor(() => expect(root.querySelector("h1")).toBe(document.activeElement));
    expect(root.querySelector("section.widget")?.hasAttribute("aria-live")).toBe(false);
  });
});

describe("airport data states", () => {
  it.each([
    ["airport_pickup", ["Pickup Airport", "Airline", "Flight #", "Dropoff Address"]],
    ["airport_dropoff", ["Pickup Address", "Dropoff Airport", "Airline", "Flight #"]],
  ] as const)("loads fields in BRO order for %s", async (service, order) => {
    const root = renderTrip(service, mockClient());
    await vi.waitFor(() => expect(root.querySelector("#airport")).not.toBeNull());
    expect(root.querySelector("#airline")?.getAttribute("role")).toBe("combobox");
    expectOrder(labels(root), [...order]);
    expect(root.textContent).not.toContain("Loading airports and airlines");
  });

  it("shows a clear message when airports are empty", async () => {
    const root = renderTrip("airport_pickup", mockClient({ getAirports: async () => [] }));
    await vi.waitFor(() => expect(root.textContent).toContain("No airports available"));
    expect(root.querySelector("#airport")).toBeNull();
  });

  it("shows a clear message when airlines are empty", async () => {
    const root = renderTrip("airport_pickup", mockClient({ getAirlines: async () => [] }));
    await vi.waitFor(() => expect(root.textContent).toContain("No airlines available"));
    expect(root.querySelector("#airline")).toBeNull();
  });

  it.each(["getAirports", "getAirlines"] as const)(
    "ends loading when %s fails",
    async (method) => {
      const root = renderTrip("airport_pickup", mockClient({
        [method]: async () => Promise.reject(new Error("offline")),
      }));
      await vi.waitFor(() => expect(root.textContent).toContain("could not be loaded"));
      expect(root.textContent).not.toContain("Loading airports and airlines");
    },
  );

  it("ends loading for a malformed API response", async () => {
    const fetch = vi.fn(async (request: Request) => new Response(JSON.stringify({
      data: request.url.endsWith("/airports") ? { broken: true } : AIRLINES,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const client = createApiClient({ apiBase: "https://api.test", businessKey: "key", fetch });
    const root = renderTrip("airport_pickup", client);
    await vi.waitFor(() => expect(root.textContent).toContain("could not be loaded"));
    expect(root.textContent).not.toContain("Loading airports and airlines");
  });

});

describe("airport API field errors", () => {
  it("shows a pickup-address error beside the pickup-airport field", async () => {
    const message = "A pickup address is required.";
    const root = renderTrip("airport_pickup", mockClient(), false, {
      pickupAirportId: message,
    });
    await vi.waitFor(() => expect(root.querySelector("#airport")).not.toBeNull());
    expect(root.querySelector("#airport")?.getAttribute("aria-invalid")).toBe("true");
    expect(root.querySelector("#airport")?.getAttribute("aria-describedby")).toBe("airport-error");
    expect(root.textContent).toContain(message);
    expect(root.querySelector("#airport-error")?.parentElement?.querySelector("#airport"))
      .not.toBeNull();
  });

  it("exposes the active airline option to assistive technology", async () => {
    const root = renderTrip("airport_pickup", mockClient());
    await vi.waitFor(() => expect(root.querySelector("#airline")).not.toBeNull());
    root.querySelector<HTMLInputElement>("#airline")?.focus();
    await vi.waitFor(() => expect(root.querySelector("#airline-options")).not.toBeNull());
    expect(root.querySelector("#airline")?.getAttribute("aria-activedescendant"))
      .toBe("airline-options-0");
    expect(root.querySelector("#airline-options-0")?.getAttribute("role")).toBe("option");
    expect(comboboxOptionId("pickup-address-options", 0)).toBe("pickup-address-options-0");
  });
});

describe("trip field error placement", () => {
  it("renders every one-way error inside its own field", () => {
    const errors: TripErrors = {
      pickupDate: "Bad date", pickupTime: "Bad time", passengers: "Bad passengers",
      luggage: "Bad luggage", pickupAddress: "Bad pickup", dropoffAddress: "Bad dropoff",
    };
    const root = renderTrip("one_way", mockClient(), false, errors);
    for (const [inputId, errorId] of [
      ["pickup-date", "pickup-date-error"], ["pickup-time", "pickup-time-error"],
      ["passengers", "passengers-error"], ["luggage", "luggage-error"],
      ["pickup-address", "pickup-address-error"], ["dropoff-address", "dropoff-address-error"],
    ]) {
      expect(root.querySelector(`#${errorId}`)?.parentElement?.querySelector(`#${inputId}`))
        .not.toBeNull();
    }
    expect(root.querySelector("#pickup-address")?.getAttribute("aria-autocomplete")).toBe("list");
    expect(root.querySelector("#pickup-address")?.getAttribute("aria-controls"))
      .toBe("pickup-address-options");
  });
});

describe("pricing submission state", () => {
  it("disables Check Pricing while a request is in flight", () => {
    const root = renderTrip("one_way", mockClient(), true);
    const button = root.querySelector<HTMLButtonElement>(".check-pricing");
    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toContain("Checking Pricing");
  });
});
