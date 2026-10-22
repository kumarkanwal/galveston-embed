import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient, Business, ServiceTypeOption } from "../src/api/client";
import { NetworkError, UnauthorizedError } from "../src/api/errors";
import { captureScriptConfig, mountBookingWidget } from "../src/embed";

const BUSINESS: Business = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Island Transit",
  type: "taxi",
  currency: "USD",
  timezone: "America/Chicago",
  distance_unit: "miles",
  max_passengers: 8,
  max_luggage: 8,
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
};

function addMount(): HTMLElement {
  const mount = document.createElement("div");
  mount.id = "galveston-booking";
  document.body.append(mount);
  return mount;
}

function clientFactory(
  getBusiness: () => Promise<Business>,
  services: ServiceTypeOption[] = [
    { id: "service-1", code: "one_way", name: "One Way Transfer" },
  ],
) {
  const client: ApiClient = {
    getBusiness: vi.fn(getBusiness),
    getServiceTypes: vi.fn(async () => services),
    getAirports: vi.fn(async () => []),
    getAirlines: vi.fn(async () => []),
    quote: vi.fn(async () => ({ out_of_service_area: false, vehicles: [] })),
    priceBreakdown: vi.fn(async () => ({
      subtotal: "0.00", discount_amount: "0.00", total: "0.00", currency: "USD",
    })),
    book: vi.fn(),
  };
  return vi.fn(() => client);
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe("embed loader", () => {
  it("logs once and stops when the mount is missing", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mountBookingWidget({ apiBase: "https://api.test", businessKey: "key" });
    expect(consoleError).toHaveBeenCalledOnce();
  });

  it("mounts a Shadow DOM only once", () => {
    const mount = addMount();
    const factory = clientFactory(async () => BUSINESS);
    const config = { apiBase: "https://api.test", businessKey: "key" };
    mountBookingWidget(config, document, factory);
    mountBookingWidget(config, document, factory);
    expect(mount.shadowRoot).not.toBeNull();
    expect(factory).toHaveBeenCalledOnce();
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("does not log the business key when mounting fails", () => {
    addMount();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mountBookingWidget(
      { apiBase: "https://api.test", businessKey: "bk_live_do_not_log" },
      document,
      () => { throw new Error("bk_live_do_not_log"); },
    );
    expect(consoleError).toHaveBeenCalledOnce();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("bk_live_do_not_log");
  });

  it("captures the key and API base from the loading script", () => {
    const script = document.createElement("script");
    script.dataset.businessKey = "bk_live_company";
    script.dataset.apiBase = "https://staging.test";
    expect(captureScriptConfig(script)).toEqual({
      apiBase: "https://staging.test",
      businessKey: "bk_live_company",
    });
  });
});

describe("embed app states", () => {
  it("renders trip details after loading", async () => {
    const mount = addMount();
    mountBookingWidget(
      { apiBase: "https://api.test", businessKey: "key" },
      document,
      clientFactory(async () => BUSINESS),
    );
    expect(mount.shadowRoot?.textContent).toContain("Loading booking form");
    await vi.waitFor(() => expect(mount.shadowRoot?.textContent).toContain("Reservations"));
  });

  it("keeps widget UI and styles isolated from host-page CSS", async () => {
    const hostStyle = document.createElement("style");
    hostStyle.textContent = ".widget { display: none; }";
    document.head.append(hostStyle);
    const mount = addMount();
    mountBookingWidget(
      { apiBase: "https://api.test", businessKey: "key" },
      document,
      clientFactory(async () => BUSINESS),
    );
    await vi.waitFor(() => expect(mount.shadowRoot?.querySelector(".widget")).not.toBeNull());
    expect(document.querySelector(".widget")).toBeNull();
    expect(mount.shadowRoot?.querySelector("style")).not.toBeNull();
    expect(document.head.querySelectorAll("style")).toHaveLength(1);
  });

});

describe("embed availability states", () => {

  it.each(["max_passengers", "max_luggage"] as const)(
    "shows contact guidance when %s is null",
    async (field) => {
      const mount = addMount();
      mountBookingWidget(
        { apiBase: "https://api.test", businessKey: "key" },
        document,
        clientFactory(async () => ({ ...BUSINESS, [field]: null })),
      );
      await vi.waitFor(() => expect(mount.shadowRoot?.textContent).toContain(
        "No vehicles are available. Please contact us.",
      ));
      expect(mount.shadowRoot?.querySelector("form")).toBeNull();
    },
  );

  it("shows contact guidance when no E-2 service is available", async () => {
    const mount = addMount();
    mountBookingWidget(
      { apiBase: "https://api.test", businessKey: "key" },
      document,
      clientFactory(async () => BUSINESS, [
        { id: "service-hourly", code: "hourly", name: "Hourly" },
      ]),
    );
    await vi.waitFor(() => {
      expect(mount.shadowRoot?.textContent).toContain("Online booking is not available");
    });
  });

  it.each([
    [new UnauthorizedError({ code: "UNAUTHORIZED", message: "No" }), "not configured"],
    [new NetworkError(new TypeError("offline")), "could not connect"],
  ])("renders a specific error state", async (error, expected) => {
    const mount = addMount();
    mountBookingWidget(
      { apiBase: "https://api.test", businessKey: "key" },
      document,
      clientFactory(async () => Promise.reject(error)),
    );
    await vi.waitFor(() => expect(mount.shadowRoot?.textContent).toContain(expected));
  });
});

