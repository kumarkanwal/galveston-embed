import type { TargetedKeyboardEvent } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

import type { LocationGroup, LocationOption } from "../../api/client";
import { FieldError } from "../trip/FieldError";

interface StopPickerProps {
  disabled: boolean;
  error: string | undefined;
  groups: LocationGroup[];
  id: "fromId" | "toId";
  label: "From" | "To";
  onChange: (value: string) => void;
  value: string;
}

interface PickerItem {
  id: string;
  kind: "category" | "location";
  value: string;
}

function findLocation(groups: LocationGroup[], value: string) {
  for (const group of groups) {
    const location = group.locations.find((candidate) => candidate.id === value);
    if (location !== undefined) return { group, location };
  }
  return null;
}

function matchingGroups(groups: LocationGroup[], query: string): LocationGroup[] {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") return groups;
  return groups.flatMap((group) => {
    const locations = group.locations.filter((location) =>
      location.name.toLocaleLowerCase().includes(needle));
    return locations.length === 0 ? [] : [{ ...group, locations }];
  });
}

function visibleItems(groups: LocationGroup[], expanded: string | null, filtering: boolean) {
  return groups.flatMap((group): PickerItem[] => {
    const category = { id: `category-${group.category_id}`, kind: "category" as const,
      value: group.category_id };
    const locations = filtering || expanded === group.category_id
      ? group.locations.map((location) => ({ id: `location-${location.id}`,
        kind: "location" as const, value: location.id })) : [];
    return [category, ...locations];
  });
}

function LocationRow(props: {
  active: boolean;
  location: LocationOption;
  onChoose: (location: LocationOption) => void;
  selected: boolean;
}) {
  return <button id={`location-${props.location.id}`} class={`stop-option${
    props.active ? " active" : ""}${props.selected ? " selected" : ""}`}
    type="button" role="option" aria-selected={props.selected}
    data-location-id={props.location.id} onClick={() => props.onChoose(props.location)}>
    <span aria-hidden="true">↳</span> {props.location.name}
  </button>;
}

function PickerMenu(props: {
  activeId: string | null;
  expanded: string | null;
  filtering: boolean;
  groups: LocationGroup[];
  listboxId: string;
  onCategory: (id: string) => void;
  onChoose: (location: LocationOption) => void;
  value: string;
}) {
  if (props.groups.length === 0) {
    return <div class="stop-menu" id={props.listboxId} role="listbox">
      <p class="stop-empty">{props.filtering ? "No matches" : "No locations available"}</p>
    </div>;
  }
  return <div class="stop-menu" id={props.listboxId} role="listbox">
    {props.groups.map((group) => {
      const isExpanded = props.filtering || props.expanded === group.category_id;
      return <div class="stop-category-group" key={group.category_id} role="group"
        aria-label={group.category}>
        <button id={`category-${group.category_id}`} class={`stop-category${
          props.activeId === `category-${group.category_id}` ? " active" : ""}`}
          type="button" role="option" aria-selected="false" aria-expanded={isExpanded}
          data-category-id={group.category_id}
          onClick={() => props.onCategory(group.category_id)}>
          <span aria-hidden="true">🚌</span><span>{group.category}</span>
          <span class="stop-chevron" aria-hidden="true">{isExpanded ? "⌄" : "›"}</span>
        </button>
        {isExpanded && group.locations.map((location) => <LocationRow
          active={props.activeId === `location-${location.id}`} location={location}
          onChoose={props.onChoose} selected={props.value === location.id}
          key={location.id} />)}
      </div>;
    })}
  </div>;
}

function nextItemId(items: PickerItem[], activeId: string | null, offset: number) {
  const current = items.findIndex((item) => item.id === activeId);
  const next = current < 0 ? (offset > 0 ? 0 : items.length - 1)
    : (current + offset + items.length) % items.length;
  return items[next]?.id ?? null;
}

function usePickerState(props: StopPickerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = findLocation(props.groups, props.value);
  const filtered = useMemo(() => matchingGroups(props.groups, query), [props.groups, query]);
  const filtering = query.trim() !== "";
  const items = visibleItems(filtered, expanded, filtering);
  const close = () => { setOpen(false); setQuery(""); setActiveId(null); };
  const show = () => {
    if (props.disabled) return;
    setExpanded(selected?.group.category_id ?? null); setQuery(""); setOpen(true);
  };
  const choose = (location: LocationOption) => { props.onChange(location.id); close(); };
  const toggleCategory = (id: string) => setExpanded((current) => current === id ? null : id);
  const activate = (offset: number) => {
    if (!open) { show(); return; }
    if (items.length === 0) return;
    setActiveId(nextItemId(items, activeId, offset));
  };
  const enter = () => {
    const item = items.find((candidate) => candidate.id === activeId);
    if (item?.kind === "category") toggleCategory(item.value);
    if (item?.kind === "location") {
      const match = findLocation(filtered, item.value);
      if (match !== null) choose(match.location);
    }
  };
  const onKeyDown = (event: TargetedKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); activate(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && open) { event.preventDefault(); enter(); }
    else if (event.key === "Escape" && open) { event.preventDefault(); close(); }
    else if (event.key === "Tab" && open) close();
  };
  const onInput = (value: string) => { setQuery(value); setOpen(true); setActiveId(null); };
  return { activeId, close, choose, expanded, filtered, filtering, onInput, onKeyDown,
    open, query, selected, show, toggleCategory };
}

function useOutsideClose(root: { current: HTMLDivElement | null }, close: () => void) {
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (!event.composedPath().includes(root.current as EventTarget)) close();
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);
}

export function StopPicker(props: StopPickerProps) {
  const root = useRef<HTMLDivElement>(null);
  const state = usePickerState(props);
  const listboxId = `${props.id}-listbox`;
  useOutsideClose(root, state.close);

  return <div class="field stop-field" ref={root}>
    <label for={props.id}>{props.label}</label>
    <div class="stop-control"><span aria-hidden="true">🚌</span>
      <input id={props.id} role="combobox" type="text" autoComplete="off"
        aria-autocomplete="list" aria-controls={listboxId} aria-expanded={state.open}
        aria-activedescendant={state.activeId ?? undefined} aria-invalid={props.error !== undefined}
        disabled={props.disabled} placeholder={props.label}
        value={state.open ? state.query : state.selected?.location.name ?? ""}
        onFocus={state.show} onClick={state.show} onKeyDown={state.onKeyDown}
        onInput={(event) => state.onInput(event.currentTarget.value)} />
      <span class="stop-control-chevron" aria-hidden="true">⌄</span>
    </div>
    {state.open && <PickerMenu activeId={state.activeId} expanded={state.expanded}
      filtering={state.filtering} groups={state.filtered} listboxId={listboxId}
      onCategory={state.toggleCategory} onChoose={state.choose} value={props.value} />}
    <FieldError id={`${props.id}-error`} message={props.error} />
  </div>;
}
