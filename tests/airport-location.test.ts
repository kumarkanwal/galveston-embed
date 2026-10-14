import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Airport } from "../src/api/client";
import {
  airportSearchRequest,
  resolveAirportLocation,
} from "../src/maps/airport-location";

const mocks = vi.hoisted(() => ({
  loadPlacesLibrary: vi.fn(),
  searchByText: vi.fn(),
}));

vi.mock("../src/maps/google-maps-loader", () => ({
  loadPlacesLibrary: mocks.loadPlacesLibrary,
}));

const IAH: Airport = {
  id: "iah",
  name: "George Bush Intercontinental",
  code: "IAH",
};

beforeEach(() => {
  mocks.searchByText.mockReset();
  mocks.loadPlacesLibrary.mockReset();
  mocks.loadPlacesLibrary.mockResolvedValue({ Place: { searchByText: mocks.searchByText } });
});

describe("airport Google Places resolution", () => {
  it("builds a US airport-only text search without hardcoded coordinates", () => {
    expect(airportSearchRequest(IAH)).toEqual({
      fields: ["location"],
      includedType: "airport",
      maxResultCount: 1,
      region: "us",
      textQuery: "George Bush Intercontinental IAH airport",
      useStrictTypeFiltering: true,
    });
  });

  it("returns coordinates from the first matching Place", async () => {
    mocks.searchByText.mockResolvedValue({
      places: [{ location: { lat: () => 29.9902, lng: () => -95.3368 } }],
    });
    await expect(resolveAirportLocation(IAH, "maps-key")).resolves.toEqual({
      lat: 29.9902,
      lng: -95.3368,
    });
    expect(mocks.loadPlacesLibrary).toHaveBeenCalledWith("maps-key");
  });

  it("returns null when Places has no airport location", async () => {
    mocks.searchByText.mockResolvedValue({ places: [] });
    await expect(resolveAirportLocation(IAH, "maps-key")).resolves.toBeNull();
  });
});
