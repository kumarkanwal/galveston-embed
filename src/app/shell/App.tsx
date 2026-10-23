import { useEffect, useState } from "preact/hooks";

import { isShuttleApiClient } from "../../api/client";
import type { ApiClient, Business, ServiceTypeOption } from "../../api/client";
import { NetworkError, UnauthorizedError } from "../../api/errors";
import { BookingFlow } from "./BookingFlow";
import { ShuttleFlow } from "../shuttle/ShuttleFlow";

interface AppProps {
  client: ApiClient;
  mapsKey: string;
}

type ViewState =
  | { status: "loading" }
  | { status: "ready"; business: Business; services: ServiceTypeOption[] }
  | { status: "unauthorized" }
  | { status: "network-error" }
  | { status: "error" };

function failedState(error: unknown): ViewState {
  if (error instanceof UnauthorizedError) return { status: "unauthorized" };
  if (error instanceof NetworkError) return { status: "network-error" };
  return { status: "error" };
}

function messageFor(state: ViewState): string {
  if (state.status === "loading") return "Loading booking form…";
  if (state.status === "unauthorized") return "This booking form is not configured.";
  if (state.status === "network-error") {
    return "The booking form could not connect. Please try again.";
  }
  return "The booking form could not be loaded. Please try again.";
}

export function App({ client, mapsKey }: AppProps) {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    client.getBusiness().then(async (business) => {
      const services = business.type === "taxi" ? await client.getServiceTypes() : [];
      return { business, services };
    })
      .then(({ business, services }) => {
        if (active) setState({ status: "ready", business, services });
      })
      .catch((error: unknown) => {
        if (active) setState(failedState(error));
      });
    return () => {
      active = false;
    };
  }, [client]);

  if (state.status === "ready") {
    if (state.business.type === "shuttle") {
      if (!isShuttleApiClient(client)) {
        return <section class="widget status" aria-live="polite">
          This booking form is not configured.
        </section>;
      }
      return <ShuttleFlow business={state.business} client={client} />;
    }
    if (state.business.type !== "taxi") {
      return <section class="widget status" aria-live="polite">
        This booking form is not configured.
      </section>;
    }
    return <BookingFlow business={state.business} services={state.services}
      client={client} mapsKey={mapsKey} />;
  }
  return <section class="widget status" aria-live="polite">{messageFor(state)}</section>;
}

