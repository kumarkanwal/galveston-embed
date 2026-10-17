import type { Airport } from "../api/client";
import type { MapPoint } from "../app/trip/types";
import { loadGeocodingLibrary, loadPlacesLibrary } from "./google-maps-loader";

let warnedAboutGeocoding = false;

function mapPoint(location: google.maps.LatLng | undefined | null): MapPoint | null {
  return location == null ? null : { lat: location.lat(), lng: location.lng() };
}

function warnAboutGeocoding(): void {
  if (warnedAboutGeocoding) return;
  warnedAboutGeocoding = true;
  console.warn("Airport address geocoding is unavailable; using airport search fallback.");
}

export function airportGeocodeRequest(airport: Airport): google.maps.GeocoderRequest | null {
  const address = typeof airport.address === "string" ? airport.address.trim() : "";
  const zipcode = typeof airport.zipcode === "string" ? airport.zipcode.trim() : "";
  if (address === "" || zipcode === "") return null;
  return { address: `${address}, ${zipcode}`, region: "US" };
}

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

async function resolveExactAirportLocation(
  request: google.maps.GeocoderRequest,
  mapsKey: string,
): Promise<MapPoint | null> {
  const library = await loadGeocodingLibrary(mapsKey);
  const response = await new library.Geocoder().geocode(request);
  return mapPoint(response.results[0]?.geometry.location);
}

async function resolveAirportSearchLocation(
  airport: Airport,
  mapsKey: string,
): Promise<MapPoint | null> {
  const library = await loadPlacesLibrary(mapsKey);
  const result = await library.Place.searchByText(airportSearchRequest(airport));
  return mapPoint(result.places[0]?.location);
}

export async function resolveAirportLocation(
  airport: Airport,
  mapsKey: string,
): Promise<MapPoint | null> {
  const exactRequest = airportGeocodeRequest(airport);
  if (exactRequest !== null) {
    try {
      const exactLocation = await resolveExactAirportLocation(exactRequest, mapsKey);
      if (exactLocation !== null) return exactLocation;
      warnAboutGeocoding();
    } catch {
      warnAboutGeocoding();
    }
  }
  return resolveAirportSearchLocation(airport, mapsKey);
}

export function resetAirportLocationWarningForTests(): void {
  warnedAboutGeocoding = false;
}
