import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TaxiBookingResponse } from "../src/api/client";
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
  response: TaxiBookingResponse | typeof SHUTTLE_BOOKED,
  paymentMethod: "cash" | "online",
  emailsEnabled?: boolean,
) {
  const root = document.createElement("div");
  render(<Confirmation currency="USD" customerEmail={CUSTOMER_EMAIL}
    {...(emailsEnabled === undefined ? {} : { emailsEnabled })} paymentMethod={paymentMethod}
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
});
