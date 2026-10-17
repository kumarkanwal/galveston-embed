import { render } from "preact";
import { useState } from "preact/hooks";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient, Airport, Business } from "../src/api/client";
import { useBookingFlow } from "../src/app/shell/use-booking-flow";
import { TripDetails } from "../src/app/trip/TripDetails";
import type { CoreServiceCode, MapPoint } from "../src/app/trip/types";

const mocks = vi.hoisted(() => ({ resolveAirportLocation: vi.fn() }));

vi.mock("../src/maps/airport-location", () => ({
  resolveAirportLocation: mocks.resolveAirportLocation,
}));

vi.mock("../src/app/trip/MapPanel", () => ({
  MapPanel: ({ dropoff, pickup }: { dropoff: MapPoint | null; pickup: MapPoint | null }) =>
    <div data-testid="map" data-pickup={JSON.stringify(pickup)}
      data-dropoff={JSON.stringify(dropoff)} />,
}));

const AIRPORTS: Airport[] = [
  { id: "iah", name: "George Bush Intercontinental", code: "IAH",
    address: "2800 N Terminal Rd, Houston, TX", zipcode: "77032" },
  { id: "hou", name: "William P. Hobby", code: "HOU",
    address: "7800 Airport Blvd, Houston, TX", zipcode: "77061" },
];
const BUSINESS = {
  id: "business-1", name: "Island Transit", type: "taxi", currency: "USD",
  timezone: "America/Chicago", distance_unit: "miles",
  max_passengers: 8, max_luggage: 8,
  settings: { advance_booking_hours: 0, insurance_enabled: false,
    insurance_pct: "0.00", offer_car_seats: true, max_car_seats: 5,
    car_seat_price: "15.00", payment_methods: ["cash"] },
} satisfies Business;
const SERVICES = [
  { id: "pickup", code: "airport_pickup", name: "Airport Pickup" },
  { id: "dropoff", code: "airport_dropoff", name: "Airport Dropoff" },
] as const;

function client(): ApiClient {
  return {
    getBusiness: vi.fn(async () => BUSINESS),
    getServiceTypes: vi.fn(async () => []),
    getAirports: vi.fn(async () => AIRPORTS),
    getAirlines: vi.fn(async () => [{ id: "airline", name: "Example Air" }]),
    quote: vi.fn(async () => ({ out_of_service_area: false, vehicles: [] })),
    priceBreakdown: vi.fn(async () => ({
      subtotal: "0.00", discount_amount: "0.00", total: "0.00", currency: "USD",
    })),
    book: vi.fn(),
  };
}

type Flow = ReturnType<typeof useBookingFlow>;
let latestFlow: Flow | undefined;

function Harness({ service }: { service: CoreServiceCode }) {
  const [apiClient] = useState(client);
  const flow = useBookingFlow(apiClient, BUSINESS, service, { passengers: 8, luggage: 8 });
  latestFlow = flow;
  return <TripDetails client={apiClient} errors={flow.state.errors} form={flow.state.form}
    formError={flow.state.formError} isSubmitting={false} mapsKey="maps-key"
    limits={{ passengers: 8, luggage: 8 }} onFieldBlur={flow.blur} onSubmit={flow.submit}
    routePolyline={null} services={[...SERVICES]}
    timeZone="America/Chicago" update={flow.update} />;
}

function flow(): Flow {
  if (latestFlow === undefined) throw new Error("Flow has not rendered.");
  return latestFlow;
}

async function chooseAirport(root: HTMLElement, id: string): Promise<void> {
  await vi.waitFor(() => expect(root.querySelector("#airport")).not.toBeNull());
  const select = root.querySelector<HTMLSelectElement>("#airport");
  if (select === null) throw new Error("Airport select missing.");
  select.value = id;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function marker(root: HTMLElement, kind: "pickup" | "dropoff"): MapPoint | null {
  const value = root.querySelector("[data-testid='map']")?.getAttribute(`data-${kind}`);
  return value === null || value === undefined ? null : JSON.parse(value) as MapPoint | null;
}

beforeEach(() => {
  document.body.replaceChildren();
  latestFlow = undefined;
  mocks.resolveAirportLocation.mockReset();
});

describe("airport markers", () => {
  it.each([
    ["airport_pickup", "iah", { lat: 29.9902, lng: -95.3368 }, "pickup"],
    ["airport_pickup", "hou", { lat: 29.6454, lng: -95.2789 }, "pickup"],
    ["airport_dropoff", "iah", { lat: 29.9902, lng: -95.3368 }, "dropoff"],
    ["airport_dropoff", "hou", { lat: 29.6454, lng: -95.2789 }, "dropoff"],
  ] as const)("shows the %s %s marker", async (service, id, point, kind) => {
    mocks.resolveAirportLocation.mockResolvedValue(point);
    const root = document.createElement("div");
    document.body.append(root);
    render(<Harness service={service} />, root);
    await chooseAirport(root, id);
    await vi.waitFor(() => expect(marker(root, kind)).toEqual(point));
    expect(marker(root, kind === "pickup" ? "dropoff" : "pickup")).toBeNull();
  });
});

describe("airport lookup failure", () => {
  it("keeps pricing usable without showing an error when every lookup fails", async () => {
    mocks.resolveAirportLocation.mockRejectedValue(new Error("Places unavailable"));
    const root = document.createElement("div");
    document.body.append(root);
    render(<Harness service="airport_pickup" />, root);
    await chooseAirport(root, "iah");
    await vi.waitFor(() => expect(flow().state.form.pickupAirportId).toBe("iah"));
    expect(marker(root, "pickup")).toBeNull();
    expect(root.textContent).not.toContain("Airport map location is unavailable");
    expect(root.querySelector<HTMLButtonElement>(".check-pricing")?.disabled).toBe(false);
  });
});

describe("airport marker lifecycle", () => {
  it("ignores a late result from a previous airport selection", async () => {
    const pending = new Map<string, (point: MapPoint) => void>();
    mocks.resolveAirportLocation.mockImplementation((airport: Airport) =>
      new Promise<MapPoint>((resolve) => pending.set(airport.id, resolve)));
    const root = document.createElement("div");
    document.body.append(root);
    render(<Harness service="airport_pickup" />, root);
    await chooseAirport(root, "iah");
    await vi.waitFor(() => expect(pending.has("iah")).toBe(true));
    await chooseAirport(root, "hou");
    await vi.waitFor(() => expect(pending.has("hou")).toBe(true));
    pending.get("hou")?.({ lat: 29.6454, lng: -95.2789 });
    await vi.waitFor(() => expect(marker(root, "pickup")).toEqual({
      lat: 29.6454, lng: -95.2789,
    }));
    pending.get("iah")?.({ lat: 29.9902, lng: -95.3368 });
    await Promise.resolve();
    expect(marker(root, "pickup")).toEqual({ lat: 29.6454, lng: -95.2789 });
  });

  it("clears the old marker on airport and service changes", async () => {
    let resolveNext: ((point: MapPoint) => void) | undefined;
    mocks.resolveAirportLocation.mockImplementation(() =>
      new Promise<MapPoint>((resolve) => { resolveNext = resolve; }));
    const root = document.createElement("div");
    document.body.append(root);
    render(<Harness service="airport_pickup" />, root);
    await chooseAirport(root, "iah");
    await vi.waitFor(() => expect(resolveNext).toBeTypeOf("function"));
    resolveNext?.({ lat: 29.9902, lng: -95.3368 });
    await vi.waitFor(() => expect(marker(root, "pickup")).not.toBeNull());
    await chooseAirport(root, "hou");
    await vi.waitFor(() => expect(marker(root, "pickup")).toBeNull());
    flow().update("service", "airport_dropoff");
    await vi.waitFor(() => expect(flow().state.form.pickupAirportLocation).toBeNull());
    expect(marker(root, "pickup")).toBeNull();
  });
});
