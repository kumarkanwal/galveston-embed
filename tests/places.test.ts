import { describe, expect, it } from "vitest";

import { postalCode } from "../src/maps/places";

describe("Places address components", () => {
  it("takes the zipcode from the postal_code component", () => {
    expect(postalCode([
      { longText: "Galveston", types: ["locality", "political"] },
      { longText: "77550", types: ["postal_code"] },
    ])).toBe("77550");
  });

  it("returns null when Places gives no postal code", () => {
    expect(postalCode([
      { longText: "Texas", types: ["administrative_area_level_1"] },
    ])).toBeNull();
    expect(postalCode(undefined)).toBeNull();
  });
});
