import { useEffect, useState } from "preact/hooks";

import { ErrorIcon, FieldError } from "./FieldError";
import { comboboxOptionId } from "./combobox-a11y";
import type { SelectedAddress } from "./types";
import { usePlaceAutocomplete } from "./use-place-autocomplete";

interface AddressFieldProps {
  error: string | undefined;
  id: "pickup-address" | "dropoff-address";
  label: string;
  mapsKey: string;
  onBlur: () => void;
  onChange: (address: SelectedAddress | null) => void;
  value: SelectedAddress | null;
}

function predictionText(prediction: google.maps.places.PlacePrediction): string {
  return prediction.text.toString();
}

function MapPinIcon() {
  return <span class="address-pin" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
    </svg>
  </span>;
}

function AddressOptions(props: {
  activeIndex: number;
  choose: (prediction: google.maps.places.PlacePrediction) => void;
  id: string;
  suggestions: google.maps.places.PlacePrediction[];
}) {
  return <ul class="options" id={props.id} role="listbox">
    {props.suggestions.map((prediction, index) => <li role="option"
      id={comboboxOptionId(props.id, index)}
      aria-selected={index === props.activeIndex}
      class={index === props.activeIndex ? "active" : ""}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => props.choose(prediction)}>{predictionText(prediction)}</li>)}
  </ul>;
}

function AddressMessages(props: {
  error: string | null;
  loading: boolean;
  lookupErrorId: string;
}) {
  return <>
    {props.loading && <small class="field-note" role="status">Looking up addresses…</small>}
    {props.error !== null && <small class="field-note error-note"
      id={props.lookupErrorId} role="alert">
      <ErrorIcon /> <span>{props.error}</span>
    </small>}
  </>;
}

export function AddressField(props: AddressFieldProps) {
  const [text, setText] = useState(props.value?.address ?? ""), [open, setOpen] = useState(false);
  const activeQuery = props.value?.address === text ? "" : text,
    autocomplete = usePlaceAutocomplete(activeQuery, props.mapsKey);
  const { activeIndex, error, loading, suggestions } = autocomplete.state;
  const errorId = `${props.id}-error`, lookupErrorId = `${props.id}-lookup-error`,
    optionsId = `${props.id}-options`;
  const describedBy = [props.error === undefined ? null : errorId,
    error === null ? null : lookupErrorId].filter(Boolean).join(" ") || undefined;
  const activeOptionId = open && suggestions[activeIndex] !== undefined
    ? comboboxOptionId(optionsId, activeIndex) : undefined;
  useEffect(() => setText(props.value?.address ?? ""), [props.value]);
  useEffect(() => setOpen(suggestions.length > 0), [suggestions]);

  const choose = (prediction: google.maps.places.PlacePrediction) => {
    setOpen(false); void autocomplete.select(prediction).then((address) => {
      if (address !== null) setText(address.address); props.onChange(address);
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
    <div class="input-with-icon address-input">
      <input id={props.id} role="combobox" placeholder={props.label}
        value={text} aria-expanded={open} aria-controls={optionsId} aria-autocomplete="list"
        aria-activedescendant={activeOptionId} aria-invalid={props.error !== undefined}
        aria-describedby={describedBy} onBlur={props.onBlur} onKeyDown={keyDown} onInput={(event) => {
          setText(event.currentTarget.value); props.onChange(null);
        }} />
      <MapPinIcon />
    </div>
    <AddressMessages error={error} loading={loading} lookupErrorId={lookupErrorId} />
    {open && <AddressOptions activeIndex={activeIndex} choose={choose}
      id={optionsId} suggestions={suggestions} />}
    <FieldError id={errorId} message={props.error} />
  </div>;
}
