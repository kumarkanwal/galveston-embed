import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Airport } from "../src/api/client";
import {
  airportGeocodeRequest,
  airportSearchRequest,
  resetAirportLocationWarningForTests,
  resolveAirportLocation,
} from "../src/maps/airport-location";
import * as googleMapsLoader from "../src/maps/google-maps-loader";

const mocks = {
  geocode: vi.fn(),
  searchByText: vi.fn(),
};

const IAH: Airport = {
  id: "iah",
  name: "George Bush Intercontinental",
  code: "IAH",
  address: "2800 N Terminal Rd, Houston, TX",
  zipcode: "77032",
};

beforeEach(() => {
  resetAirportLocationWarningForTests();
  mocks.geocode.mockReset();
  mocks.searchByText.mockReset();
  vi.spyOn(googleMapsLoader, "loadGeocodingLibrary").mockResolvedValue({
    Geocoder: class { geocode = mocks.geocode; },
  } as unknown as google.maps.GeocodingLibrary);
  vi.spyOn(googleMapsLoader, "loadPlacesLibrary").mockResolvedValue({
    Place: { searchByText: mocks.searchByText },
  } as unknown as google.maps.PlacesLibrary);
});

describe("airport Google Places resolution", () => {
  it("builds an exact address and zipcode geocoding request", () => {
    expect(airportGeocodeRequest(IAH)).toEqual({
      address: "2800 N Terminal Rd, Houston, TX, 77032",
      region: "US",
    });
  });

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

  it("pin uses airport address", async () => {
    mocks.geocode.mockResolvedValue({
      results: [{ geometry: {
        location: { lat: () => 29.9844, lng: () => -95.3414 },
      } }],
    });
    await expect(resolveAirportLocation(IAH, "maps-key")).resolves.toEqual({
      lat: 29.9844,
      lng: -95.3414,
    });
    expect(mocks.geocode).toHaveBeenCalledWith({
      address: "2800 N Terminal Rd, Houston, TX, 77032",
      region: "US",
    });
    expect(googleMapsLoader.loadPlacesLibrary).not.toHaveBeenCalled();
  });
});

describe("airport location fallback", () => {
  it("fallback when address missing", async () => {
    const airport = { id: "iah", name: IAH.name, code: IAH.code } as Airport;
    mocks.searchByText.mockResolvedValue({
      places: [{ location: { lat: () => 29.9902, lng: () => -95.3368 } }],
    });
    await expect(resolveAirportLocation(airport, "maps-key")).resolves.toEqual({
      lat: 29.9902,
      lng: -95.3368,
    });
    expect(googleMapsLoader.loadGeocodingLibrary).not.toHaveBeenCalled();
    expect(mocks.searchByText).toHaveBeenCalledWith(airportSearchRequest(airport));
  });

  it("falls back when address geocoding fails and warns only once", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(googleMapsLoader.loadGeocodingLibrary)
      .mockRejectedValue(new Error("REQUEST_DENIED"));
    mocks.searchByText.mockResolvedValue({
      places: [{ location: { lat: () => 29.9902, lng: () => -95.3368 } }],
    });
    await resolveAirportLocation(IAH, "maps-key");
    await resolveAirportLocation(IAH, "maps-key");
    expect(mocks.searchByText).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });

  it("falls back when exact geocoding returns no result", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.geocode.mockResolvedValue({ results: [] });
    mocks.searchByText.mockResolvedValue({ places: [] });
    await expect(resolveAirportLocation(IAH, "maps-key")).resolves.toBeNull();
    warning.mockRestore();
  });
});
