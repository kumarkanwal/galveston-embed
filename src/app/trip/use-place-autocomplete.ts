import { useEffect, useRef, useState } from "preact/hooks";

import { loadPlacesLibrary } from "../../maps/google-maps-loader";
import {
  addressAutocompleteRequest,
  isAllowedAddressSuggestion,
  selectedAddressFromPlace,
} from "../../maps/places";
import type { SelectedAddress } from "./types";

interface PlaceAutocompleteState {
  activeIndex: number;
  error: string | null;
  loading: boolean;
  suggestions: google.maps.places.PlacePrediction[];
}

const INITIAL_STATE: PlaceAutocompleteState = {
  activeIndex: 0,
  error: null,
  loading: false,
  suggestions: [],
};

export function usePlaceAutocomplete(query: string, mapsKey: string) {
  const [state, setState] = useState(INITIAL_STATE);
  const sequence = useRef(0);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    const requestSequence = ++sequence.current;
    if (query.trim().length < 2) {
      setState(INITIAL_STATE);
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    const timer = window.setTimeout(() => {
      void loadPlacesLibrary(mapsKey).then(async (library) => {
        token.current ??= new library.AutocompleteSessionToken();
        const request = addressAutocompleteRequest(query, token.current);
        const result = await library.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if (sequence.current !== requestSequence) return;
        const suggestions = result.suggestions.flatMap((item) =>
          item.placePrediction === null ? [] : [item.placePrediction],
        ).filter(isAllowedAddressSuggestion);
        setState({ activeIndex: 0, error: null, loading: false, suggestions });
      }).catch(() => {
        if (sequence.current !== requestSequence) return;
        setState({ ...INITIAL_STATE, error: "Address lookup is unavailable." });
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [mapsKey, query]);

  const select = async (
    prediction: google.maps.places.PlacePrediction,
  ): Promise<SelectedAddress | null> => {
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ["formattedAddress", "addressComponents", "location"] });
    token.current = null;
    setState(INITIAL_STATE);
    return selectedAddressFromPlace(place);
  };
  return { state, setState, select };
}
