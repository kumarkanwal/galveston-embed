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
import { BAG_COUNT_SCHEMA_LIMIT } from "../trip/limits";
import { buildReturnQuery, buildShuttleQuote, buildShuttleSearchQuery } from "./requests";
import { isShuttleAvailabilityError, SHUTTLE_UNAVAILABLE_MESSAGE } from "./availability";
import { minimumPassengerError } from "./minimum";
import type {
  SelectedShuttleLeg,
  ShuttleTripErrors,
  ShuttleTripForm,
} from "./types";
import { hasShuttleTripErrors, validateShuttleTrip } from "./validation";

type ShuttleStep = "trip" | "outbound" | "confirm" | "done";

interface ShuttleFlowState {
  confirmation: {
    customerEmail: string;
    paymentMethod: PaymentMethod;
    response: ShuttleBookingResponse;
  } | null;
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
    date, fromId: "", largeBags: 0, paxAdult: 1, paxChild: 0, paxSenior: 0,
    returnDate: "", roundTrip: false, smallBags: 0, toId: "",
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

function completeSelection(state: ShuttleFlowState) {
  if (state.form.roundTrip && state.returnLeg === null) return null;
  return selectedTrip(state, state.returnLeg);
}

type SetFlowState = Dispatch<StateUpdater<ShuttleFlowState>>;
interface FlowContext {
  client: ShuttleApiClient;
  maximumBags: number;
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
  const errors = validateShuttleTrip(
    context.state.form, context.minimumDate, context.maximumBags,
  );
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
      context.setState((current) => ({ ...current, outbound: leg, submitting: false }));
    }
  } catch (error: unknown) {
    const minimum = minimumPassengerError(error);
    if (minimum !== null) {
      context.setState((current) => ({ ...current, notice: minimum, submitting: false }));
    } else if (isShuttleAvailabilityError(error)) {
      await returnToDepartures(context, SHUTTLE_UNAVAILABLE_MESSAGE);
    } else {
      context.setState((current) => ({ ...current, notice: errorMessage(error), submitting: false }));
    }
  } finally { context.requestInFlight.current = false; }
}

async function chooseReturn(context: FlowContext, leg: SelectedShuttleLeg) {
  context.setState((current) => ({ ...current, notice: null, quote: null,
    returnLeg: leg, submitting: false }));
}

async function continueToConfirm(context: FlowContext) {
  if (context.requestInFlight.current) return;
  const selection = completeSelection(context.state);
  if (selection === null) return;
  context.requestInFlight.current = true;
  context.setState((current) => ({ ...current, notice: null, submitting: true }));
  try {
    const quote = await context.client.quoteShuttle(
      buildShuttleQuote(selection, null, context.paymentMethod),
    );
    context.setState((current) => ({ ...current, quote, step: "confirm", submitting: false }));
  } catch (error: unknown) {
    const minimum = minimumPassengerError(error);
    if (minimum !== null) {
      context.setState((current) => ({ ...current, notice: minimum, submitting: false }));
    } else if (isShuttleAvailabilityError(error)) {
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
  const maximumBags = Math.min(
    business.max_luggage ?? BAG_COUNT_SCHEMA_LIMIT * 2,
    BAG_COUNT_SCHEMA_LIMIT * 2,
  );
  const context = {
    client, maximumBags, minimumDate, paymentMethod, requestInFlight, setState, state,
  };
  const update = <Key extends keyof ShuttleTripForm>(
    key: Key,
    value: ShuttleTripForm[Key],
  ) => updateTrip(context, key, value);
  const back = () => setState((current) => ({ ...current, notice: null,
    step: current.step === "confirm" ? "outbound" : "trip" }));
  const selection = completeSelection(state);
  const complete = (
    response: ShuttleBookingResponse,
    paymentMethod: PaymentMethod,
    customerEmail: string,
  ) => setState((current) => (
    { ...current, confirmation: { customerEmail, paymentMethod, response }, step: "done" }));
  return { back, chooseOutbound: (leg: SelectedShuttleLeg) => chooseOutbound(context, leg),
    chooseReturn: (leg: SelectedShuttleLeg) => chooseReturn(context, leg), complete,
    continueToConfirm: () => continueToConfirm(context), maximumBags, selection, state,
    submitTrip: (event: SubmitEvent) => submitTrip(context, event),
    unavailable: (message: string) => returnToDepartures(context, message), update };
}
