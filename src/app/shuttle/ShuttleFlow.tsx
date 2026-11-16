import type {
  Business,
  PaymentMethod,
  ShuttleApiClient,
  ShuttleBookingResponse,
} from "../../api/client";
import { businessDateTimeParts } from "../../time";
import { Confirmation } from "../booking/Confirmation";
import { ShuttleConfirm } from "./ShuttleConfirm";
import { ShuttleDepartures } from "./Departures";
import { ShuttleTrip } from "./Trip";
import { useShuttleFlow } from "./use-shuttle-flow";
import { passengerTotal } from "./minimum";
import { formatPickupTime } from "./pickup-time";
import type {
  SelectedShuttleLeg,
  ShuttlePickupTimes,
  ShuttleSelection,
} from "./types";

interface ShuttleFlowProps {
  business: Business;
  client: ShuttleApiClient;
  mapsKey: string;
}

function confirmationLegLine(
  label: string,
  leg: SelectedShuttleLeg,
  pickupTime: string,
): string {
  const pickupLabel = label === "Return" ? "Return pickup time" : "Pickup time";
  const pickup = ` · ${pickupLabel}: ${formatPickupTime(pickupTime)}`;
  if (leg.kind === "private") return `${label}: ${leg.date}${pickup}`;
  const end = leg.departure.end_time == null ? "" : ` – ${leg.departure.end_time}`;
  return `${label}: ${leg.date} at ${leg.departure.start_time}${end}${pickup}`;
}

function confirmationJourneyLines(
  selection: ShuttleSelection | null,
  pickupTimes: ShuttlePickupTimes,
): string[] | undefined {
  if (selection === null) return undefined;
  return [confirmationLegLine("Outbound", selection.outbound, pickupTimes.outbound),
    ...(selection.returnLeg === null ? []
      : [confirmationLegLine("Return", selection.returnLeg, pickupTimes.return)])];
}

function ShuttleConfirmation(props: {
  business: Business;
  customerEmail: string;
  paymentMethod: PaymentMethod;
  pickupTimes: ShuttlePickupTimes;
  response: ShuttleBookingResponse;
  selection: ShuttleSelection | null;
}) {
  return <Confirmation currency={props.business.currency} requestQuote={false}
    businessName={props.business.name} logoUrl={props.business.logo_url}
    customerEmail={props.customerEmail} emailsEnabled={props.business.emails_enabled}
    paymentMethod={props.paymentMethod}
    journeyLines={confirmationJourneyLines(props.selection, props.pickupTimes)}
    response={props.response} steps={["Trip", "Departures", "Confirm"]} />;
}

export function ShuttleFlow(props: ShuttleFlowProps) {
  const flow = useShuttleFlow(props.client, props.business);
  const state = flow.state,
    minimumDate = businessDateTimeParts(new Date(), props.business.timezone).date;
  if (state.step === "done" && state.confirmation !== null) {
    return <ShuttleConfirmation business={props.business} selection={flow.selection}
      {...state.confirmation} />;
  }
  if (state.step === "confirm" && state.quote !== null && flow.selection !== null) {
    return <ShuttleConfirm business={props.business} client={props.client}
      mapsKey={props.mapsKey}
      pickupErrors={state.pickupErrors} pickupTimes={state.pickupTimes}
      quote={state.quote} selection={flow.selection}
      onBack={flow.back} onBooked={flow.complete}
      onPickupTimeError={flow.showPickupTimeError}
      onPickupTimeChange={flow.updatePickupTime}
      onUnavailable={(message) => { void flow.unavailable(message); }} />;
  }
  if (state.step === "outbound") {
    return <ShuttleDepartures businessName={props.business.name}
      canContinue={flow.selection !== null} continuing={state.submitting}
      currency={props.business.currency} logoUrl={props.business.logo_url} notice={state.notice}
      loadingOutbound={state.outboundResult === null && state.submitting}
      outboundData={state.outboundResult === null ? null
        : { result: state.outboundResult, date: state.form.date, direction: "outbound" }}
      returnData={state.form.roundTrip && state.returnResult !== null
        ? { result: state.returnResult, date: state.form.returnDate, direction: "return" }
        : null}
      loadingReturn={state.outboundResult !== null && state.returnResult === null
        && state.form.roundTrip
        && state.outbound !== null && state.submitting}
      passengerCount={passengerTotal(state.form)}
      selectedOutbound={state.outbound} selectedReturn={state.returnLeg}
      onBack={flow.back} onChooseOutbound={(leg) => { void flow.chooseOutbound(leg); }}
      onChooseReturn={(leg) => { void flow.chooseReturn(leg); }}
      onContinue={() => { void flow.continueToConfirm(); }} />;
  }
  return <ShuttleTrip businessName={props.business.name}
    destinationGroups={state.destinationGroups} errors={state.errors}
    form={state.form} formError={state.formError} loadingDestinations={state.loadingDestinations}
    loadingLocations={state.loadingLocations} logoUrl={props.business.logo_url}
    maximumBags={flow.maximumBags} minimumDate={minimumDate}
    originGroups={state.originGroups} submitting={state.submitting}
    onSubmit={(event) => { void flow.submitTrip(event); }}
    update={(key, value) => { void flow.update(key, value); }} />;
}
