import { describe, expect, it } from "vitest";

import {
  addressAutocompleteRequest,
  isAllowedAddressSuggestion,
  postalCode,
} from "../src/maps/places";

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

describe("Places address suggestions", () => {
  it("restricts autocomplete requests to the US", () => {
    const sessionToken = {} as google.maps.places.AutocompleteSessionToken;

    expect(addressAutocompleteRequest("Galveston", sessionToken)).toEqual({
      includedRegionCodes: ["us"],
      input: "Galveston",
      sessionToken,
    });
  });

  it.each([
    ["country"],
    ["administrative_area_level_1", "political"],
    ["administrative_area_level_2", "political"],
    ["administrative_area_level_7", "political"],
    ["postal_code"],
  ])("excludes non-address region types: %j", (...types) => {
    expect(isAllowedAddressSuggestion({ types })).toBe(false);
  });

  it.each([
    ["locality", "political"],
    ["street_address"],
    ["premise"],
    ["lodging", "point_of_interest", "establishment"],
    ["transit_station", "point_of_interest", "establishment"],
    ["airport", "point_of_interest", "establishment"],
  ])("allows cities, addresses and places: %j", (...types) => {
    expect(isAllowedAddressSuggestion({ types })).toBe(true);
  });
});
