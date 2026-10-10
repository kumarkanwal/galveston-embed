import { h, render } from "preact";

import { App, type BusinessClient } from "./app/shell/App";
import { createApiClient } from "./api/client";
import widgetStyles from "./styles/widget.css?inline";

const MOUNT_ID = "galveston-booking";

export interface EmbedConfig {
  apiBase: string;
  businessKey: string;
}

type ClientFactory = (config: EmbedConfig) => BusinessClient;

function defaultClientFactory(config: EmbedConfig): BusinessClient {
  return createApiClient(config);
}

function fallbackDevelopmentScript(documentRoot: Document): HTMLScriptElement | null {
  if (!import.meta.env.DEV) return null;
  return documentRoot.querySelector<HTMLScriptElement>("script[data-galveston-dev]");
}

export function captureScriptConfig(
  currentScript: HTMLScriptElement | null,
): EmbedConfig {
  return {
    businessKey: currentScript?.dataset.businessKey ?? "",
    apiBase: currentScript?.dataset.apiBase ?? import.meta.env.VITE_API_BASE ?? "",
  };
}

function reportMountError(error: unknown): void {
  console.error("Galveston booking widget could not mount.", error);
}

export function mountBookingWidget(
  config: EmbedConfig,
  documentRoot: Document = document,
  createClient: ClientFactory = defaultClientFactory,
): void {
  try {
    const mountElement = documentRoot.getElementById(MOUNT_ID);
    if (mountElement === null) {
      reportMountError(new Error(`#${MOUNT_ID} was not found.`));
      return;
    }
    if (mountElement.shadowRoot !== null) return;

    const shadowRoot = mountElement.attachShadow({ mode: "open" });
    const style = documentRoot.createElement("style");
    const appRoot = documentRoot.createElement("div");
    style.textContent = widgetStyles;
    shadowRoot.append(style, appRoot);
    render(h(App, { client: createClient(config) }), appRoot);
  } catch (error: unknown) {
    reportMountError(error);
  }
}

export function runEmbed(documentRoot: Document = document): void {
  const script = documentRoot.currentScript as HTMLScriptElement | null;
  const capturedScript = script ?? fallbackDevelopmentScript(documentRoot);
  mountBookingWidget(captureScriptConfig(capturedScript), documentRoot);
}

if (!import.meta.env.TEST) runEmbed();

