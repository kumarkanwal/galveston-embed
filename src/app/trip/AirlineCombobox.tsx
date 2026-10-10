import { useEffect, useMemo, useState } from "preact/hooks";

import type { Airline } from "../../api/client";
import { FieldError } from "./FieldError";

interface AirlineComboboxProps {
  airlines: Airline[];
  error: string | undefined;
  onChange: (airline: Airline | null) => void;
  value: Airline | null;
}

function matchingAirlines(airlines: Airline[], query: string): Airline[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized === "") return airlines;
  return airlines.filter((airline) =>
    airline.name.toLocaleLowerCase().includes(normalized),
  );
}

function AirlineOptions(props: {
  activeIndex: number;
  choose: (airline: Airline) => void;
  matches: Airline[];
}) {
  return <ul class="options" id="airline-options" role="listbox">
    {props.matches.map((airline, index) => <li role="option"
      aria-selected={index === props.activeIndex}
      class={index === props.activeIndex ? "active" : ""}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => props.choose(airline)}>{airline.name}</li>)}
  </ul>;
}

export function AirlineCombobox(props: AirlineComboboxProps) {
  const [query, setQuery] = useState(props.value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const matches = useMemo(
    () => matchingAirlines(props.airlines, query),
    [props.airlines, query],
  );
  useEffect(() => setQuery(props.value?.name ?? ""), [props.value]);

  const choose = (airline: Airline) => {
    props.onChange(airline);
    setQuery(airline.name);
    setOpen(false);
  };
  const move = (direction: number) => {
    const next = Math.max(0, Math.min(matches.length - 1, activeIndex + direction));
    setActiveIndex(next);
  };
  const keyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
      setOpen(true);
    } else if (event.key === "Enter" && open && matches[activeIndex] !== undefined) {
      event.preventDefault();
      choose(matches[activeIndex]);
    } else if (event.key === "Escape") setOpen(false);
  };

  return <div class="field combobox-field">
    <label for="airline">Airline</label>
    <div class="input-with-icon">
      <input id="airline" role="combobox" value={query} aria-expanded={open}
        aria-controls="airline-options" aria-invalid={props.error !== undefined}
        aria-describedby={props.error === undefined ? undefined : "airline-error"}
        onFocus={() => setOpen(true)} onKeyDown={keyDown}
        onInput={(event) => {
          setQuery(event.currentTarget.value);
          props.onChange(null);
          setActiveIndex(0);
          setOpen(true);
        }} />
      <span aria-hidden="true">✈</span>
    </div>
    {open && matches.length > 0 && <AirlineOptions
      activeIndex={activeIndex} choose={choose} matches={matches} />}
    <FieldError id="airline-error" message={props.error} />
  </div>;
}
