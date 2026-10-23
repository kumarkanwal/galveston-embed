import { render } from "preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Business, ShuttleApiClient } from "../src/api/client";
import { App } from "../src/app/shell/App";
import {
  LOCATION_GROUPS,
  ORIGIN_LOCATION,
  SEARCH_RESULT,
  SHUTTLE_BOOKED,
  SHUTTLE_BUSINESS,
  SHUTTLE_QUOTE,
} from "./shuttle-fixtures";

const TAXI_BUSINESS = { ...SHUTTLE_BUSINESS, type: "taxi",
  settings: { ...SHUTTLE_BUSINESS.settings, show_service_dropdown: true } } satisfies Business;

function clientFor(business: Business): ShuttleApiClient {
  return {
    getBusiness: vi.fn(async () => business),
    getServiceTypes: vi.fn(async () => [
      { id: "service", code: "one_way" as const, name: "One Way" },
    ]),
    getAirports: vi.fn(async () => []),
    getAirlines: vi.fn(async () => []),
    quote: vi.fn(async () => ({ out_of_service_area: false, vehicles: [] })),
    priceBreakdown: vi.fn(async () => ({
      subtotal: "0.00", discount_amount: "0.00", total: "0.00", currency: "USD",
    })),
    book: vi.fn(),
    getShuttleLocations: vi.fn(async (exclude?: string) =>
      exclude === undefined ? LOCATION_GROUPS : LOCATION_GROUPS.slice(1)),
    searchShuttle: vi.fn(async () => SEARCH_RESULT),
    searchShuttleReturn: vi.fn(async () => SEARCH_RESULT),
    quoteShuttle: vi.fn(async () => SHUTTLE_QUOTE),
    bookShuttle: vi.fn(async () => SHUTTLE_BOOKED),
  };
}

function mount(client: ShuttleApiClient) {
  const root = document.createElement("div");
  document.body.append(root);
  render(<App client={client} mapsKey="" />, root);
  return root;
}

beforeEach(() => document.body.replaceChildren());

describe("business type dispatch", () => {
  it("keeps taxi mode on taxi endpoints and out of shuttle endpoints", async () => {
    const client = clientFor(TAXI_BUSINESS);
    const root = mount(client);
    await vi.waitFor(() => expect(root.textContent).toContain("Trip Details"));
    expect(client.getServiceTypes).toHaveBeenCalledOnce();
    expect(client.getShuttleLocations).not.toHaveBeenCalled();
  });

  it("keeps shuttle mode on shuttle endpoints and filters destinations by origin", async () => {
    const client = clientFor(SHUTTLE_BUSINESS);
    const root = mount(client);
    await vi.waitFor(() => expect(root.querySelectorAll("#fromId option").length).toBeGreaterThan(1));
    expect(client.getServiceTypes).not.toHaveBeenCalled();
    expect(client.getShuttleLocations).toHaveBeenCalledWith();
    const origin = root.querySelector<HTMLSelectElement>("#fromId");
    if (origin === null) throw new Error("Missing shuttle origin");
    origin.value = ORIGIN_LOCATION.id;
    origin.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(client.getShuttleLocations)
      .toHaveBeenLastCalledWith(ORIGIN_LOCATION.id));
    expect(client.getAirports).not.toHaveBeenCalled();
    expect(client.quote).not.toHaveBeenCalled();
  });
});
