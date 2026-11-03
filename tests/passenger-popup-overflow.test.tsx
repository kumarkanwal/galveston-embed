import { render, type ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

import { PassengerDropdown } from "../src/app/shuttle/PassengerDropdown";
import type { ShuttleTripForm } from "../src/app/shuttle/types";
import { TripCoreFields } from "../src/app/trip/TripCoreFields";
import type { TripFormState } from "../src/app/trip/types";

const SHUTTLE_FORM: ShuttleTripForm = {
  fromId: "", toId: "", date: "2026-11-03", returnDate: "",
  roundTrip: false, largeBags: 0, smallBags: 0,
  paxAdult: 1, paxSenior: 0, paxChild: 0,
};

const TAXI_FORM: TripFormState = {
  service: "one_way", pickupDate: "2026-11-03", pickupTime: "10:00",
  returnDate: "", returnTime: "", passengers: 1, largeBags: 0, smallBags: 0,
  pickupAddress: null, dropoffAddress: null,
  pickupAirportId: "", pickupAirportName: "", pickupAirportLocation: null,
  dropoffAirportId: "", dropoffAirportName: "", dropoffAirportLocation: null,
  airline: null, flightNumber: "",
};

function ShuttleHarness() {
  const [form, setForm] = useState(SHUTTLE_FORM);
  const update = <Key extends keyof ShuttleTripForm>(key: Key, value: ShuttleTripForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  return <PassengerDropdown error={undefined} form={form} update={update} />;
}

function TaxiHarness() {
  const [form, setForm] = useState(TAXI_FORM);
  const update = <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  return <TripCoreFields errors={{}} form={form} limits={{ passengers: 12, bags: 12 }}
    onFieldBlur={() => undefined} roundTripAlternative={null}
    services={[{ id: "one", code: "one_way", name: "One Way" }]}
    showServiceDropdown={true} timeZone="America/Chicago" update={update} />;
}

function renderAtWidth(child: ComponentChildren, width: number) {
  const root = document.createElement("div");
  root.style.width = `${width}px`;
  document.body.append(root);
  render(child, root);
  return root;
}

beforeEach(() => document.body.replaceChildren());

describe.each([320, 360])("passenger controls at %ipx", (width) => {
  it("renders every shuttle popup stepper inside its constrained row", () => {
    const root = renderAtWidth(<ShuttleHarness />, width);
    act(() => root.querySelector<HTMLButtonElement>(".passenger-trigger")?.click());
    const popup = root.querySelector(".passenger-popup-box");
    expect(popup?.querySelectorAll(".passenger-popup-row")).toHaveLength(3);
    expect(popup?.querySelectorAll(".passenger-popup-stepper")).toHaveLength(3);
  });

  it("preserves the taxi native passenger control and bag steppers", () => {
    const root = renderAtWidth(<TaxiHarness />, width);
    expect(root.querySelector("#passengers")?.tagName).toBe("SELECT");
    expect(root.querySelectorAll(".party-fields .counter-controls")).toHaveLength(2);
  });
});
