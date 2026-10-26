import { render } from "preact";
import { useState } from "preact/hooks";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ApiClient,
  Business,
  PaymentMethod,
  TaxiPriceBreakdownResponse,
} from "../src/api/client";
import { IdempotencyKeyManager, stableSerialize } from "../src/api/idempotency";
import { buildBookingRequest, buildBreakdownRequest } from "../src/app/confirm/build-requests";
import { cardPaymentSettings } from "../src/app/confirm/payment";
import { PaymentMethodField } from "../src/app/confirm/PaymentMethodField";
import type { ConfirmFormState } from "../src/app/confirm/types";
import { usePriceBreakdown } from "../src/app/confirm/use-price-breakdown";
import { buildShuttleBooking, buildShuttleQuote } from "../src/app/shuttle/requests";
import type { ShuttleSelection } from "../src/app/shuttle/types";
import type { TripFormState } from "../src/app/trip/types";
import { DEPARTURE, DESTINATION_LOCATION, ORIGIN_LOCATION } from "./shuttle-fixtures";

const TRIP = {
  service: "one_way", pickupDate: "2026-10-30", pickupTime: "10:00",
  returnDate: "2026-10-31", returnTime: "10:00", passengers: 1,
  largeBags: 0, smallBags: 0,
  pickupAddress: { address: "Galveston", zipcode: "77550", location: { lat: 1, lng: 2 } },
  dropoffAddress: { address: "Houston", zipcode: "77002", location: { lat: 3, lng: 4 } },
  pickupAirportId: "", pickupAirportName: "", pickupAirportLocation: null,
  dropoffAirportId: "", dropoffAirportName: "", dropoffAirportLocation: null,
  airline: null, flightNumber: "",
} satisfies TripFormState;

const BREAKDOWN = {
  subtotal: "90.00", discount_amount: "0.00", total: "90.00", currency: "USD",
} satisfies TaxiPriceBreakdownResponse;

const CONTACT = {
  acceptedTerms: true, comments: "", email: "ada@example.com",
  firstName: "Ada", lastName: "Lovelace", phone: "",
} satisfies ConfirmFormState;

const SELECTION = {
  trip: { fromId: ORIGIN_LOCATION.id, toId: DESTINATION_LOCATION.id,
    date: "2026-10-30", returnDate: "2026-10-31", roundTrip: false,
    paxAdult: 1, paxSenior: 0, paxChild: 0 },
  from: ORIGIN_LOCATION, to: DESTINATION_LOCATION,
  outbound: { kind: "scheduled", date: "2026-10-30", departure: DEPARTURE },
  returnLeg: null,
} satisfies ShuttleSelection;

function clientWith(priceBreakdown: ApiClient["priceBreakdown"]): ApiClient {
  return {
    getBusiness: vi.fn(), getServiceTypes: vi.fn(), getAirports: vi.fn(), getAirlines: vi.fn(),
    quote: vi.fn(), priceBreakdown, book: vi.fn(),
  };
}

function PricingHarness({ client, cardAvailable }: {
  cardAvailable: boolean;
  client: ApiClient;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const pricing = usePriceBreakdown(client, TRIP, "vehicle-1", 0, true, method);
  return <div>
    <PaymentMethodField cardAvailable={cardAvailable} method={method} onChange={setMethod} />
    {pricing.state.status === "ready" && <output>{pricing.state.data.total}</output>}
  </div>;
}

function chooseCard(root: HTMLElement): void {
  const input = root.querySelector<HTMLInputElement>('input[value="online"]');
  if (input === null) throw new Error("Missing Card payment option");
  act(() => {
    input.checked = true;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => document.body.replaceChildren());

describe("payment capability and pricing", () => {
  it("requires an affirmative generated capability", () => {
    const base = { payments: null } as Business;
    expect(cardPaymentSettings(base)).toBeNull();
    expect(cardPaymentSettings({ ...base, payments: {
      card_available: false, environment: "sandbox",
      square_application_id: "app", square_location_id: "location",
    } })).toBeNull();
  });

  it("hides Card when unavailable and re-prices online when selected", async () => {
    const priceBreakdown = vi.fn<ApiClient["priceBreakdown"]>(async () => BREAKDOWN);
    const root = document.createElement("div");
    render(<PaymentMethodField cardAvailable={false} method="cash" onChange={vi.fn()} />, root);
    expect(root.querySelector(".payment-method")).toBeNull();
    render(<PricingHarness cardAvailable client={clientWith(priceBreakdown)} />, root);
    await vi.waitFor(() => expect(priceBreakdown).toHaveBeenCalledOnce());
    chooseCard(root);
    await vi.waitFor(() => expect(priceBreakdown).toHaveBeenCalledTimes(2));
    expect(priceBreakdown.mock.calls[1]?.[0].payment_method).toBe("online");
  });

  it("does not let a stale cash response replace online pricing", async () => {
    const resolvers: Array<(value: TaxiPriceBreakdownResponse) => void> = [];
    const priceBreakdown = vi.fn(() => new Promise<TaxiPriceBreakdownResponse>((resolve) => {
      resolvers.push(resolve);
    }));
    const root = document.createElement("div");
    render(<PricingHarness cardAvailable client={clientWith(priceBreakdown)} />, root);
    chooseCard(root);
    await vi.waitFor(() => expect(priceBreakdown).toHaveBeenCalledTimes(2));
    resolvers[1]?.({ ...BREAKDOWN, total: "95.48" });
    await vi.waitFor(() => expect(root.textContent).toContain("95.48"));
    resolvers[0]?.(BREAKDOWN); await Promise.resolve();
    expect(root.textContent).not.toContain("90.00");
  });
});

describe("payment request models", () => {
  it("uses the generated online values without inventing amounts", () => {
    expect(buildBreakdownRequest(TRIP, "vehicle-1", 0, null, "online").payment_method)
      .toBe("online");
    expect(buildBookingRequest(TRIP, "vehicle-1", 0, CONTACT, null, "online").payment)
      .toEqual({ method: "online" });
    expect(buildShuttleQuote(SELECTION, null, "online").payment_method).toBe("online");
    expect(buildShuttleBooking(SELECTION, CONTACT, "", null, "online").payment)
      .toEqual({ method: "online" });
  });

  it("changes the idempotency key when Cash or Card changes", async () => {
    let next = 0;
    const manager = new IdempotencyKeyManager(
      () => `key-${++next}`,
      null,
      async (body) => stableSerialize(body),
    );
    const cash = buildBookingRequest(TRIP, "vehicle-1", 0, CONTACT, null, "cash");
    const online = buildBookingRequest(TRIP, "vehicle-1", 0, CONTACT, null, "online");
    const cashKey = await manager.getKey(cash);
    await expect(manager.getKey(online)).resolves.not.toBe(cashKey);
  });
});
