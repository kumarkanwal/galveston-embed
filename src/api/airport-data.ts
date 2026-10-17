import type { Airline, Airport } from "./client";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAirport(value: unknown): value is Airport {
  if (!isRecord(value)) return false;
  const validCode = value.code === undefined || value.code === null
    || typeof value.code === "string";
  const validAddress = value.address === undefined || value.address === null
    || typeof value.address === "string";
  const validZipcode = value.zipcode === undefined || value.zipcode === null
    || typeof value.zipcode === "string";
  return typeof value.id === "string" && typeof value.name === "string"
    && validCode && validAddress && validZipcode;
}

function isAirline(value: unknown): value is Airline {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.name === "string";
}

export function validateAirports(value: unknown): Airport[] {
  if (!Array.isArray(value) || !value.every(isAirport)) {
    throw new Error("Invalid airports response.");
  }
  return value;
}

export function validateAirlines(value: unknown): Airline[] {
  if (!Array.isArray(value) || !value.every(isAirline)) {
    throw new Error("Invalid airlines response.");
  }
  return value;
}
