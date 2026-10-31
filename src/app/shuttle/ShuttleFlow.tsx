import type { Business, ShuttleApiClient } from "../../api/client";
import { businessDateTimeParts } from "../../time";
import { Confirmation } from "../booking/Confirmation";
import { ShuttleConfirm } from "./ShuttleConfirm";
import { ShuttleDepartures } from "./Departures";
import { ShuttleTrip } from "./Trip";
import { useShuttleFlow } from "./use-shuttle-flow";
import { passengerTotal } from "./minimum";

interface ShuttleFlowProps {
  business: Business;
  client: ShuttleApiClient;
  mapsKey: string;
}

export function ShuttleFlow(props: ShuttleFlowProps) {
  const flow = useShuttleFlow(props.client, props.business);
  const state = flow.state;
  const minimumDate = businessDateTimeParts(new Date(), props.business.timezone).date;
  if (state.step === "done" && state.confirmation !== null) {
    return <Confirmation currency={props.business.currency} requestQuote={false}
      businessName={props.business.name} logoUrl={props.business.logo_url}
      customerEmail={state.confirmation.customerEmail}
      emailsEnabled={props.business.emails_enabled}
      paymentMethod={state.confirmation.paymentMethod}
      response={state.confirmation.response} steps={["Trip", "Departures", "Confirm"]} />;
  }
  if (state.step === "confirm" && state.quote !== null && flow.selection !== null) {
    return <ShuttleConfirm business={props.business} client={props.client}
      mapsKey={props.mapsKey}
      quote={state.quote} selection={flow.selection} onBack={flow.back}
      onBooked={flow.complete} onUnavailable={(message) => { void flow.unavailable(message); }} />;
  }
  if (state.step === "outbound") {
    return <ShuttleDepartures businessName={props.business.name}
      currency={props.business.currency} logoUrl={props.business.logo_url} notice={state.notice}
      loadingOutbound={state.outboundResult === null && state.submitting}
      outboundData={state.outboundResult === null ? null
        : { result: state.outboundResult, date: state.form.date, direction: "outbound" }}
      returnData={state.form.roundTrip && state.returnResult !== null
        ? { result: state.returnResult, date: state.form.returnDate, direction: "return" }
        : null}
      loadingReturn={state.outboundResult !== null && state.form.roundTrip
        && state.outbound !== null && state.submitting}
      passengerCount={passengerTotal(state.form)}
      onBack={flow.back} onChooseOutbound={(leg) => { void flow.chooseOutbound(leg); }}
      onChooseReturn={(leg) => { void flow.chooseReturn(leg); }}
      onDateChange={(direction, date) => { void flow.refreshDate(direction, date); }} />;
  }
  return <ShuttleTrip businessName={props.business.name}
    destinationGroups={state.destinationGroups} errors={state.errors}
    form={state.form} formError={state.formError} loadingDestinations={state.loadingDestinations}
    loadingLocations={state.loadingLocations} logoUrl={props.business.logo_url}
    minimumDate={minimumDate}
    originGroups={state.originGroups}
    submitting={state.submitting} timeZone={props.business.timezone}
    onSubmit={(event) => { void flow.submitTrip(event); }}
    update={(key, value) => { void flow.update(key, value); }} />;
}
