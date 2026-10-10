import { render } from "preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient, Airline, Airport } from "../src/api/client";
import { createApiClient } from "../src/api/client";
import { TripDetails } from "../src/app/trip/TripDetails";
import type { CoreServiceCode, TripFormState } from "../src/app/trip/types";

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
    dropoffAirportId: "",
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
    ...overrides,
  };
}

function renderTrip(service: CoreServiceCode, client: ApiClient): HTMLElement {
  const root = document.createElement("div");
  document.body.append(root);
  render(<TripDetails client={client} errors={{}} form={formFor(service)} mapsKey=""
    onSubmit={() => undefined} services={[...SERVICES]} update={() => undefined} />, root);
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
