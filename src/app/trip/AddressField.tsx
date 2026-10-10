import { useEffect, useState } from "preact/hooks";

import { FieldError } from "./FieldError";
import type { SelectedAddress } from "./types";
import { usePlaceAutocomplete } from "./use-place-autocomplete";

interface AddressFieldProps {
  error: string | undefined;
  id: "pickup-address" | "dropoff-address";
  label: string;
  mapsKey: string;
  onChange: (address: SelectedAddress | null) => void;
  value: SelectedAddress | null;
}

function predictionText(prediction: google.maps.places.PlacePrediction): string {
  return prediction.text.toString();
}

function AddressOptions(props: {
  activeIndex: number;
  choose: (prediction: google.maps.places.PlacePrediction) => void;
  id: string;
  suggestions: google.maps.places.PlacePrediction[];
}) {
  return <ul class="options" id={props.id} role="listbox">
    {props.suggestions.map((prediction, index) => <li role="option"
      aria-selected={index === props.activeIndex}
      class={index === props.activeIndex ? "active" : ""}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => props.choose(prediction)}>{predictionText(prediction)}</li>)}
  </ul>;
}

export function AddressField(props: AddressFieldProps) {
  const [text, setText] = useState(props.value?.address ?? "");
  const [open, setOpen] = useState(false);
  const activeQuery = props.value?.address === text ? "" : text;
  const autocomplete = usePlaceAutocomplete(activeQuery, props.mapsKey);
  const { activeIndex, error, loading, suggestions } = autocomplete.state;
  const errorId = `${props.id}-error`, optionsId = `${props.id}-options`;
  useEffect(() => setText(props.value?.address ?? ""), [props.value]);
  useEffect(() => setOpen(suggestions.length > 0), [suggestions]);

  const choose = (prediction: google.maps.places.PlacePrediction) => {
    setOpen(false);
    void autocomplete.select(prediction).then((address) => {
      if (address !== null) setText(address.address);
      props.onChange(address);
    }).catch(() => props.onChange(null));
  };
  const move = (direction: number) => {
    const next = Math.max(0, Math.min(suggestions.length - 1, activeIndex + direction));
    autocomplete.setState((current) => ({ ...current, activeIndex: next }));
  };
  const keyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
      setOpen(true);
    } else if (event.key === "Enter" && open && suggestions[activeIndex] !== undefined) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === "Escape") setOpen(false);
  };
  return <div class="field address-field">
    <label for={props.id}>{props.label}</label>
    <div class="input-with-icon">
      <input id={props.id} role="combobox" placeholder={props.label}
        value={text} aria-expanded={open} aria-controls={optionsId}
        aria-invalid={props.error !== undefined} aria-describedby={errorId}
        onKeyDown={keyDown} onInput={(event) => {
          setText(event.currentTarget.value);
          props.onChange(null);
        }} />
      <span aria-hidden="true">⌖</span>
    </div>
    {loading && <small class="field-note">Looking up addresses…</small>}
    {error !== null && <small class="field-note error-note">{error}</small>}
    {open && <AddressOptions activeIndex={activeIndex} choose={choose}
      id={optionsId} suggestions={suggestions} />}
    <FieldError id={errorId} message={props.error} />
  </div>;
}
