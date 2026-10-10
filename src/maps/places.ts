import type { SelectedAddress } from "../app/trip/types";

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
