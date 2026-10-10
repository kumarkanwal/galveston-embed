import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Business } from "../src/api/client";
import { NetworkError, UnauthorizedError } from "../src/api/errors";
import { captureScriptConfig, mountBookingWidget } from "../src/embed";

const BUSINESS: Business = {
  id: "11111111-1111-1111-1111-111111111111",
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
};

function addMount(): HTMLElement {
  const mount = document.createElement("div");
  mount.id = "galveston-booking";
  document.body.append(mount);
  return mount;
}

function clientFactory(getBusiness: () => Promise<Business>) {
  return vi.fn(() => ({ getBusiness: vi.fn(getBusiness) }));
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
  it("renders the business name after loading", async () => {
    const mount = addMount();
    mountBookingWidget(
      { apiBase: "https://api.test", businessKey: "key" },
      document,
      clientFactory(async () => BUSINESS),
    );
    expect(mount.shadowRoot?.textContent).toContain("Loading booking form");
    await vi.waitFor(() => expect(mount.shadowRoot?.textContent).toContain(BUSINESS.name));
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

