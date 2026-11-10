import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShuttleBookingResponse, TaxiBookingResponse } from "../src/api/client";
import { Confirmation } from "../src/app/booking/Confirmation";
import { SHUTTLE_BOOKED } from "./shuttle-fixtures";

const TAXI_BOOKED = {
  order_id: "11111111-1111-1111-1111-111111111111",
  order_number: "MG-2026-000018",
  status: "pending",
  total: "120.00",
  amount_paid: "0.00",
  payment_method: "cash",
  confirmation_email_sent: true,
} satisfies TaxiBookingResponse;

let writeText = vi.fn(async (_text: string) => undefined);
const CUSTOMER_EMAIL = "ada@example.com";

function mount(
  response: TaxiBookingResponse | ShuttleBookingResponse,
  paymentMethod: "cash" | "online",
  emailsEnabled?: boolean,
  journeyLines?: string[],
) {
  const root = document.createElement("div");
  render(<Confirmation currency="USD" customerEmail={CUSTOMER_EMAIL}
    {...(emailsEnabled === undefined ? {} : { emailsEnabled })} paymentMethod={paymentMethod}
    {...(journeyLines === undefined ? {} : { journeyLines })}
    requestQuote={false} response={response} />, root);
  return root;
}

beforeEach(() => {
  writeText = vi.fn(async (_text: string) => undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

describe.each([
  ["taxi", TAXI_BOOKED],
  ["shuttle", SHUTTLE_BOOKED],
] as const)("%s confirmation", (_mode, response) => {
  it.each([
    ["cash", true],
    ["cash", false],
    ["cash", undefined],
    ["online", true],
    ["online", false],
    ["online", undefined],
  ] as const)("uses %s wording when emails_enabled is %s", (paymentMethod, emailsEnabled) => {
    const root = mount(response, paymentMethod, emailsEnabled);
    const prefix = paymentMethod === "online" ? "Payment submitted. " : "";
    expect(root.textContent).toContain(
      `${prefix}Your booking is requested. Our team will contact you to confirm.`,
    );
    expect(root.querySelector(".confirmation-reference")?.textContent)
      .toContain(`Booking reference: ${response.order_number}`);
    expect(root.textContent).not.toContain("Payment processing");
    if (emailsEnabled === true) {
      expect(root.textContent).toContain(
        `A confirmation email has been sent to ${CUSTOMER_EMAIL}.`,
      );
    } else {
      expect(root.textContent?.toLowerCase()).not.toContain("email");
    }
  });

  it("copies the prominent booking reference", async () => {
    const root = mount(response, "cash", false);
    act(() => root.querySelector<HTMLButtonElement>(".confirmation-reference button")?.click());
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(response.order_number));
  });

  it("shows Bags and Carry-on only for shuttle responses", () => {
    const root = mount(response, "cash", false);
    if (_mode === "shuttle") {
      expect(root.querySelector(".confirmation-luggage")?.textContent)
        .toContain("2 check-in · ▫ 1 carry-on");
    } else {
      expect(root.querySelector(".confirmation-luggage")).toBeNull();
    }
  });

});

describe("private shuttle confirmation", () => {
  it("shows the arranged time supplied for a private leg", () => {
    const root = mount(SHUTTLE_BOOKED, "cash", false,
      ["Outbound: 2026-10-30 · Time: to be arranged"]);
    expect(root.querySelector(".confirmation-journey")?.textContent)
      .toBe("Outbound: 2026-10-30 · Time: to be arranged");
  });

  it("shows booking passenger lines, one included peak, adjustments, and total", () => {
    const response = { ...SHUTTLE_BOOKED,
      legs: [
        { ...SHUTTLE_BOOKED.legs[0]!, passenger_lines: [
          { passenger_type: "adult" as const, count: 1,
            unit_price: "18.00", line_total: "18.00" },
          { passenger_type: "senior" as const, count: 1,
            unit_price: "22.00", line_total: "22.00" },
        ], charges: [{ label: "Peak Hours Increase", amount: "5.00",
          kind: "surcharge" as const, included_in_total: true as const }], leg_total: "45.00" },
        { ...SHUTTLE_BOOKED.legs[0]!, booking_id: "return-booking", passenger_lines: [
          { passenger_type: "adult" as const, count: 1,
            unit_price: "40.00", line_total: "40.00" },
          { passenger_type: "senior" as const, count: 1,
            unit_price: "38.00", line_total: "38.00" },
        ], charges: [], leg_total: "78.00" },
      ], adjustments: [{ label: "Card Surcharge", amount: "4.00",
        kind: "surcharge" as const, included_in_total: true as const }], total: "127.00",
    } satisfies ShuttleBookingResponse;
    const root = mount(response, "online", false);
    expect([...root.querySelectorAll(".shuttle-passenger-line")]
      .map((line) => line.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "Adult × 1 ($18.00 USD)$18.00 USD",
      "Senior × 1 ($22.00 USD)$22.00 USD",
      "Adult × 1 ($40.00 USD)$40.00 USD",
      "Senior × 1 ($38.00 USD)$38.00 USD",
    ]);
    expect(root.querySelectorAll(".shuttle-included-charge")).toHaveLength(1);
    expect(root.querySelector(".shuttle-adjustment")?.textContent)
      .toContain("Card Surcharge$4.00 USD");
    expect(root.querySelector(".confirmation-total")?.textContent).toContain("$127.00 USD");
  });
});
