import type { SelectedAddress } from "../app/trip/types";

const EXCLUDED_ADDRESS_TYPES = new Set([
  "country",
  "postal_code",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "administrative_area_level_4",
  "administrative_area_level_5",
  "administrative_area_level_6",
  "administrative_area_level_7",
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
  return !prediction.types.some((type) => EXCLUDED_ADDRESS_TYPES.has(type));
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
  if (place.formattedAddress == null || place.location == null) return null;
  return {
    address: place.formattedAddress,
    zipcode: postalCode(place.addressComponents),
    location: { lat: place.location.lat(), lng: place.location.lng() },
  };
}
