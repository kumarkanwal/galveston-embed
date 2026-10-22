import { describe, expect, it } from "vitest";

import type { ServiceTypeOption } from "../src/api/client";
import {
  filterCoreServices,
  firstNonRoundTripService,
} from "../src/app/trip/service-types";

describe("service types", () => {
  it("keeps round_trip and the supported taxi services in API order", () => {
    const services: ServiceTypeOption[] = [
      { id: "1", code: "airport_dropoff", name: "Dropoff" },
      { id: "2", code: "hourly", name: "Hourly", minimum_hours: 6 },
      { id: "3", code: "one_way", name: "One Way" },
      { id: "4", code: "round_trip", name: "Round Trip" },
      { id: "5", code: "airport_pickup", name: "Pickup" },
    ];
    expect(filterCoreServices(services).map((service) => service.code)).toEqual([
      "airport_dropoff", "one_way", "round_trip", "airport_pickup",
    ]);
  });

  it("selects the first permitted non-round-trip service in API order", () => {
    const services = filterCoreServices([
      { id: "1", code: "round_trip", name: "Round Trip" },
      { id: "2", code: "airport_pickup", name: "Airport Pickup" },
      { id: "3", code: "one_way", name: "One Way" },
    ]);
    expect(firstNonRoundTripService(services)?.code).toBe("airport_pickup");
  });

  it("returns an empty list when no core service is offered", () => {
    const services: ServiceTypeOption[] = [
      { id: "1", code: "hourly", name: "Hourly" },
    ];
    expect(filterCoreServices(services)).toEqual([]);
  });
});
