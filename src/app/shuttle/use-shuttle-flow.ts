import { useEffect, useRef, useState } from "preact/hooks";
import type { Dispatch, StateUpdater } from "preact/hooks";

import type {
  Business,
  LocationGroup,
  LocationOption,
  PaymentMethod,
  ShuttleBookingResponse,
  ShuttleQuoteResponse,
  ShuttleSearchResult,
  ShuttleApiClient,
} from "../../api/client";
import { ApiError } from "../../api/errors";
import { businessDateTimeParts } from "../../time";
import { paymentAvailability } from "../confirm/payment";
import { buildReturnQuery, buildShuttleQuote, buildShuttleSearchQuery } from "./requests";
import { isShuttleAvailabilityError, SHUTTLE_UNAVAILABLE_MESSAGE } from "./availability";
import type {
  SelectedShuttleLeg,
  ShuttleTripErrors,
  ShuttleTripForm,
} from "./types";
import { hasShuttleTripErrors, validateShuttleTrip } from "./validation";

type ShuttleStep = "trip" | "outbound" | "confirm" | "done";

interface ShuttleFlowState {
  confirmation: { paymentMethod: PaymentMethod; response: ShuttleBookingResponse } | null;
  destinationGroups: LocationGroup[];
  errors: ShuttleTripErrors;
  form: ShuttleTripForm;
  formError: string | null;
  loadingDestinations: boolean;
  loadingLocations: boolean;
  notice: string | null;
  originGroups: LocationGroup[];
  outbound: SelectedShuttleLeg | null;
  outboundResult: ShuttleSearchResult | null;
  quote: ShuttleQuoteResponse | null;
  returnLeg: SelectedShuttleLeg | null;
  returnResult: ShuttleSearchResult | null;
  step: ShuttleStep;
  submitting: boolean;
}

function initialForm(business: Business): ShuttleTripForm {
  const date = businessDateTimeParts(new Date(), business.timezone).date;
  return {
    date, fromId: "", paxAdult: 1, paxChild: 0, paxSenior: 0,
    returnDate: "", roundTrip: false, toId: "",
  };
}

function initialState(business: Business): ShuttleFlowState {
  return {
    confirmation: null, destinationGroups: [], errors: {}, form: initialForm(business),
    formError: null, loadingDestinations: false, loadingLocations: true, notice: null,
    originGroups: [], outbound: null, outboundResult: null,
    quote: null, returnLeg: null,
    returnResult: null, step: "trip", submitting: false,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError && error.message !== "") return error.message;
  return "The shuttle schedule could not be loaded. Please try again.";
}

function findLocation(groups: LocationGroup[], id: string): LocationOption | null {
  for (const group of groups) {
    const location = group.locations.find((candidate) => candidate.id === id);
    if (location !== undefined) return location;
  }
  return null;
}

function selectedTrip(state: ShuttleFlowState, returnLeg: SelectedShuttleLeg | null) {
  const from = findLocation(state.originGroups, state.form.fromId);
  const to = findLocation(state.destinationGroups, state.form.toId);
  if (from === null || to === null || state.outbound === null) return null;
  return { trip: state.form, from, to, outbound: state.outbound, returnLeg };
}

type SetFlowState = Dispatch<StateUpdater<ShuttleFlowState>>;
interface FlowContext {
  client: ShuttleApiClient;
  minimumDate: string;
  paymentMethod: PaymentMethod;
  requestInFlight: { current: boolean };
  setState: SetFlowState;
  state: ShuttleFlowState;
}

function useLocations(client: ShuttleApiClient, setState: SetFlowState) {
  useEffect(() => {
    let active = true;
    client.getShuttleLocations().then((groups) => {
      if (active) setState((current) => ({ ...current, loadingLocations: false,
        originGroups: groups }));
    }).catch((error: unknown) => {
      if (active) setState((current) => ({ ...current, loadingLocations: false,
        formError: errorMessage(error) }));
    });
    return () => { active = false; };
  }, [client]);
}

async function updateTrip<Key extends keyof ShuttleTripForm>(
  context: FlowContext,
  key: Key,
  value: ShuttleTripForm[Key],
) {
  context.setState((current) => {
    const form = { ...current.form, [key]: value };
    if (key === "roundTrip" && value === false) form.returnDate = "";
    if (key === "fromId") form.toId = "";
    return { ...current, errors: { ...current.errors, [key]: undefined }, form,
      formError: null, notice: null, outbound: null, outboundResult: null, quote: null,
      returnLeg: null, returnResult: null };
  });
  if (key !== "fromId") return;
  context.setState((current) => ({ ...current, destinationGroups: [], loadingDestinations: true }));
  try {
    const groups = value === "" ? [] : await context.client.getShuttleLocations(String(value));
    context.setState((current) => ({ ...current, destinationGroups: groups,
      loadingDestinations: false }));
  } catch (error: unknown) {
    context.setState((current) => ({ ...current, formError: errorMessage(error),
      loadingDestinations: false }));
  }
}

async function submitTrip(context: FlowContext, event: SubmitEvent) {
  event.preventDefault();
  if (context.requestInFlight.current) return;
  const errors = validateShuttleTrip(context.state.form, context.minimumDate);
  if (hasShuttleTripErrors(errors)) {
    context.setState((current) => ({ ...current, errors })); return;
  }
  context.requestInFlight.current = true;
  context.setState((current) => ({ ...current, errors: {}, formError: null, submitting: true }));
  try {
    const query = buildShuttleSearchQuery(context.state.form);
    const result = await context.client.searchShuttle(query);
    context.setState((current) => ({ ...current, outboundResult: result,
      step: "outbound", submitting: false }));
  } catch (error: unknown) {
    context.setState((current) => ({ ...current, formError: errorMessage(error), submitting: false }));
  } finally { context.requestInFlight.current = false; }
}

async function chooseOutbound(context: FlowContext, leg: SelectedShuttleLeg) {
  if (context.requestInFlight.current) return;
  context.requestInFlight.current = true;
  context.setState((current) => ({ ...current, notice: null, outbound: leg, quote: null,
    returnLeg: null, returnResult: null, submitting: true }));
  try {
    if (context.state.form.roundTrip) {
      const query = buildReturnQuery(context.state.form, leg);
      const result = await context.client.searchShuttleReturn(query);
      context.setState((current) => ({ ...current, outbound: leg, returnResult: result,
        step: "outbound", submitting: false }));
    } else {
      const withLeg = { ...context.state, outbound: leg };
      const selection = selectedTrip(withLeg, null);
      if (selection === null) return;
      const quote = await context.client.quoteShuttle(
        buildShuttleQuote(selection, null, context.paymentMethod),
      );
      context.setState((current) => ({ ...current, outbound: leg, quote,
        step: "confirm", submitting: false }));
    }
  } catch (error: unknown) {
    if (isShuttleAvailabilityError(error)) {
      await returnToDepartures(context, SHUTTLE_UNAVAILABLE_MESSAGE);
    } else {
      context.setState((current) => ({ ...current, notice: errorMessage(error), submitting: false }));
    }
  } finally { context.requestInFlight.current = false; }
}

async function chooseReturn(context: FlowContext, leg: SelectedShuttleLeg) {
  if (context.requestInFlight.current) return;
  context.requestInFlight.current = true;
  context.setState((current) => ({ ...current, notice: null, submitting: true }));
  const selection = selectedTrip(context.state, leg);
  if (selection === null) {
    context.requestInFlight.current = false;
    return;
  }
  try {
    const quote = await context.client.quoteShuttle(
      buildShuttleQuote(selection, null, context.paymentMethod),
    );
    context.setState((current) => ({ ...current, quote, returnLeg: leg,
      step: "confirm", submitting: false }));
  } catch (error: unknown) {
    if (isShuttleAvailabilityError(error)) {
      await returnToDepartures(context, SHUTTLE_UNAVAILABLE_MESSAGE);
    } else {
      context.setState((current) => ({ ...current, notice: errorMessage(error), submitting: false }));
    }
  } finally { context.requestInFlight.current = false; }
}

async function returnToDepartures(context: FlowContext, message: string) {
  context.setState((current) => ({ ...current, notice: message, outbound: null,
    outboundResult: null, quote: null, returnLeg: null, returnResult: null,
    step: "outbound", submitting: true }));
  try {
    const result = await context.client.searchShuttle(buildShuttleSearchQuery(context.state.form));
    context.setState((current) => ({ ...current, outboundResult: result, submitting: false }));
  } catch {
    context.setState((current) => ({ ...current, notice:
      `${message} Go back and choose the locations again.`, submitting: false }));
  }
}

export function useShuttleFlow(client: ShuttleApiClient, business: Business) {
  const [state, setState] = useState(() => initialState(business));
  const requestInFlight = useRef(false);
  useLocations(client, setState);
  const minimumDate = businessDateTimeParts(new Date(), business.timezone).date;
  const paymentMethod = paymentAvailability(business).defaultMethod ?? "cash";
  const context = { client, minimumDate, paymentMethod, requestInFlight, setState, state };
  const update = <Key extends keyof ShuttleTripForm>(
    key: Key,
    value: ShuttleTripForm[Key],
  ) => updateTrip(context, key, value);
  const back = () => setState((current) => ({ ...current, notice: null,
    step: current.step === "confirm" ? "outbound" : "trip" }));
  const selection = selectedTrip(state, state.returnLeg);
  const complete = (
    response: ShuttleBookingResponse,
    paymentMethod: PaymentMethod = "cash",
  ) => setState((current) => (
    { ...current, confirmation: { paymentMethod, response }, step: "done" }));
  return { back, chooseOutbound: (leg: SelectedShuttleLeg) => chooseOutbound(context, leg),
    chooseReturn: (leg: SelectedShuttleLeg) => chooseReturn(context, leg), complete, selection, state,
    submitTrip: (event: SubmitEvent) => submitTrip(context, event),
    unavailable: (message: string) => returnToDepartures(context, message), update };
}
