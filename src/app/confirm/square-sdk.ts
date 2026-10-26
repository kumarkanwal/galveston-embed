import type { BusinessPayments } from "../../api/client";

export const SQUARE_CARD_CONTAINER_ID = "galveston-square-card";
export const SQUARE_CARD_SLOT = "galveston-square-card";

const SQUARE_SCRIPT_ATTRIBUTE = "data-galveston-square-sdk";
const SQUARE_SCRIPT_URLS = {
  sandbox: "https://sandbox.web.squarecdn.com/v1/square.js",
  production: "https://web.squarecdn.com/v1/square.js",
} as const;

export interface SquareTokenResult {
  status: string;
  token?: string;
}

export interface SquareCard {
  attach(selector: string): Promise<void>;
  destroy?: () => Promise<void> | void;
  tokenize(): Promise<SquareTokenResult>;
}

export interface SquareApi {
  payments(applicationId: string, locationId: string): {
    card(): Promise<SquareCard>;
  };
}

interface SquareWindow extends Window {
  Square?: SquareApi;
}

interface SquareLoad {
  promise: Promise<SquareApi>;
  script: HTMLScriptElement;
  url: string;
}

const loads = new WeakMap<Document, SquareLoad>();

export class CardTokenizationError extends Error {
  constructor() {
    super("Your card could not be tokenized. Check the card details and try again.");
    this.name = "CardTokenizationError";
  }
}

export function squareScriptUrl(environment: BusinessPayments["environment"]): string {
  return SQUARE_SCRIPT_URLS[environment];
}

function squareApi(documentRoot: Document): SquareApi | undefined {
  return (documentRoot.defaultView as SquareWindow | null)?.Square;
}

function knownSquareScript(documentRoot: Document): HTMLScriptElement | null {
  const scripts = [...documentRoot.querySelectorAll<HTMLScriptElement>("script[src]")];
  return scripts.find((script) => Object.values(SQUARE_SCRIPT_URLS).includes(
    script.src as (typeof SQUARE_SCRIPT_URLS)[keyof typeof SQUARE_SCRIPT_URLS],
  )) ?? null;
}

function waitForSquare(
  documentRoot: Document,
  script: HTMLScriptElement,
): Promise<SquareApi> {
  const loaded = squareApi(documentRoot);
  if (loaded !== undefined) return Promise.resolve(loaded);
  return new Promise((resolve, reject) => {
    script.addEventListener("load", () => {
      const api = squareApi(documentRoot);
      if (api === undefined) reject(new Error("Square Web Payments SDK did not initialize."));
      else resolve(api);
    }, { once: true });
    script.addEventListener("error", () => {
      reject(new Error("Square Web Payments SDK could not be loaded."));
    }, { once: true });
  });
}

export function loadSquareSdk(
  environment: BusinessPayments["environment"],
  documentRoot: Document = document,
): Promise<SquareApi> {
  const url = squareScriptUrl(environment);
  const cached = loads.get(documentRoot);
  if (cached !== undefined && documentRoot.contains(cached.script)) {
    return cached.url === url
      ? cached.promise
      : Promise.reject(new Error("A different Square environment is already loaded."));
  }
  if (cached !== undefined) loads.delete(documentRoot);
  const known = knownSquareScript(documentRoot);
  if (known !== null && known.src !== url) {
    return Promise.reject(new Error("A different Square environment is already loaded."));
  }
  const script = known ?? documentRoot.createElement("script");
  if (known === null) {
    script.src = url;
    script.async = true;
    script.setAttribute(SQUARE_SCRIPT_ATTRIBUTE, environment);
  }
  const promise = waitForSquare(documentRoot, script);
  loads.set(documentRoot, { promise, script, url });
  if (known === null) documentRoot.head.append(script);
  return promise;
}
