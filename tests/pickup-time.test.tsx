import { render } from "preact";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "preact/test-utils";

import type { ApiClient, Business } from "../src/api/client";
import { BookingFlow } from "../src/app/shell/BookingFlow";
import { businessDateTimeParts } from "../src/time";

const BUSINESS = {
  id: "business-1", name: "Island Transit", type: "taxi", currency: "USD",
  timezone: "America/Chicago", distance_unit: "miles",
  max_passengers: 8, max_luggage: 8,
  settings: { advance_booking_hours: 6, insurance_enabled: false,
    insurance_pct: "0.00", payment_methods: ["cash"] },
} satisfies Business;

function client(): ApiClient {
  return {
    getBusiness: vi.fn(async () => BUSINESS),
    getServiceTypes: vi.fn(async () => []),
    getAirports: vi.fn(async () => []),
    getAirlines: vi.fn(async () => []),
    quote: vi.fn(async () => ({ out_of_service_area: false, vehicles: [] })),
    priceBreakdown: vi.fn(async () => ({
      subtotal: "0.00", discount_amount: "0.00", total: "0.00", currency: "USD",
    })),
    book: vi.fn(),
  };
}

function mount(): HTMLElement {
  const root = document.createElement("div");
  document.body.append(root);
  render(<BookingFlow business={BUSINESS} client={client()} mapsKey=""
    services={[{ id: "service", code: "one_way", name: "One Way" }]} />, root);
  return root;
}

function input(root: HTMLElement, id: string, value: string): HTMLInputElement {
  const element = root.querySelector<HTMLInputElement>(`#${id}`);
  if (element === null) throw new Error(`Missing input ${id}`);
  act(() => {
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return element;
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe("pickup date and time controls", () => {
  it("defaults to the Chicago date and requires an explicit time", () => {
    const expected = businessDateTimeParts(new Date(), "America/Chicago");
    const root = mount();
    const date = root.querySelector<HTMLInputElement>("#pickup-date");
    const time = root.querySelector<HTMLInputElement>("#pickup-time");
    expect(date?.value).toBe(expected.date);
    expect(date?.min).toBe(expected.date);
    expect(time?.value).toBe("");
    expect(time?.min).toBe(expected.time);
    expect(time?.required).toBe(true);
  });

  it("preserves a selected time when the date changes", () => {
    const root = mount();
    input(root, "pickup-time", "23:45");
    input(root, "pickup-date", "2099-07-02");
    const time = root.querySelector<HTMLInputElement>("#pickup-time");
    expect(time?.value).toBe("23:45");
    expect(time?.min).toBe("");
  });

  it("shows the explicit-time validation message", async () => {
    const root = mount();
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    act(() => root.querySelector<HTMLButtonElement>(".check-pricing")?.click());
    expect(root.textContent).toContain("Select a pickup time.");
    const error = root.querySelector("#pickup-time-error");
    expect(error?.parentElement?.querySelector("#pickup-time")).not.toBeNull();
    await vi.waitFor(() => expect(focus).toHaveBeenCalled());
    expect(focus.mock.instances).toContain(root.querySelector("#pickup-time"));
    expect(root.querySelector("#pickup-time")?.getAttribute("aria-describedby"))
      .toBe("pickup-time-error");
    expect(error?.querySelector(".error-icon")?.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelector("#pickup-date-error")).toBeNull();
  });

  it("hides errors initially and shows only a blurred field's error", () => {
    const root = mount();
    expect(root.querySelector(".field-error")).toBeNull();
    const time = root.querySelector<HTMLInputElement>("#pickup-time");
    act(() => { time?.dispatchEvent(new FocusEvent("blur", { bubbles: true })); });
    expect(root.querySelector("#pickup-time-error")?.textContent).toBe("Select a pickup time.");
    expect(root.querySelector("#pickup-date-error")).toBeNull();
  });
});
