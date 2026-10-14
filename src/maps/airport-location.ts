import type { Airport } from "../api/client";
import type { MapPoint } from "../app/trip/types";
import { loadPlacesLibrary } from "./google-maps-loader";

export function airportSearchRequest(
  airport: Airport,
): google.maps.places.SearchByTextRequest {
  return {
    fields: ["location"],
    includedType: "airport",
    maxResultCount: 1,
    region: "us",
    textQuery: [airport.name, airport.code, "airport"].filter(Boolean).join(" "),
    useStrictTypeFiltering: true,
  };
}

export async function resolveAirportLocation(
  airport: Airport,
  mapsKey: string,
): Promise<MapPoint | null> {
  const library = await loadPlacesLibrary(mapsKey);
  const result = await library.Place.searchByText(airportSearchRequest(airport));
  const location = result.places[0]?.location;
  return location === null || location === undefined
    ? null
    : { lat: location.lat(), lng: location.lng() };
}
