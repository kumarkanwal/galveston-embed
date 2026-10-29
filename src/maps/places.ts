import type { SelectedAddress } from "../app/trip/types";

const PRECISE_PLACE_TYPES = new Set([
  "airport",
  "establishment",
  "premise",
  "street_address",
  "subpremise",
]);

export function addressAutocompleteRequest(
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
): google.maps.places.AutocompleteRequest {
  return { includedRegionCodes: ["us"], input, sessionToken };
}

export function isAllowedAddressSuggestion(
  prediction: Pick<google.maps.places.PlacePrediction, "types">,
): boolean {
  return prediction.types.some((type) => PRECISE_PLACE_TYPES.has(type));
}

export function postalCode(
  components: ReadonlyArray<Pick<
    google.maps.places.AddressComponent,
    "longText" | "types"
  >> | undefined,
): string | null {
  const postal = components?.find((component) =>
    component.types.includes("postal_code"),
  );
  return postal?.longText ?? null;
}

export function selectedAddressFromPlace(
  place: google.maps.places.Place,
): SelectedAddress | null {
  if (!place.types?.some((type) => PRECISE_PLACE_TYPES.has(type))
    || place.formattedAddress == null || place.location == null) return null;
  return {
    address: place.formattedAddress,
    zipcode: postalCode(place.addressComponents),
    location: { lat: place.location.lat(), lng: place.location.lng() },
  };
}
