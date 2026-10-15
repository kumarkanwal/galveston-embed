import { describe, expect, it } from "vitest";

import type { ServiceTypeOption } from "../src/api/client";
import { filterCoreServices } from "../src/app/trip/service-types";

describe("service types", () => {
  it("keeps only core services in API order", () => {
    const services: ServiceTypeOption[] = [
      { id: "1", code: "airport_dropoff", name: "Dropoff" },
      { id: "2", code: "hourly", name: "Hourly", minimum_hours: 6 },
      { id: "3", code: "one_way", name: "One Way" },
      { id: "4", code: "round_trip", name: "Round Trip" },
      { id: "5", code: "airport_pickup", name: "Pickup" },
    ];
    expect(filterCoreServices(services).map((service) => service.code)).toEqual([
      "airport_dropoff", "one_way", "airport_pickup",
    ]);
  });

  it("returns an empty list when no core service is offered", () => {
    const services: ServiceTypeOption[] = [
      { id: "1", code: "hourly", name: "Hourly" },
    ];
    expect(filterCoreServices(services)).toEqual([]);
  });
});
