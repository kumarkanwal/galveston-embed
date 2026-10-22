import { beforeEach, describe, expect, it } from "vitest";

import {
  IDEMPOTENCY_STORAGE_KEY,
  IdempotencyKeyManager,
  stableSerialize,
} from "../src/api/idempotency";

function sequentialUuids() {
  let next = 0;
  return () => `00000000-0000-4000-8000-00000000000${++next}`;
}

function fingerprints() {
  const values = new Map<string, string>();
  return async (body: object) => {
    const serialized = stableSerialize(body);
    const existing = values.get(serialized);
    if (existing !== undefined) return existing;
    const value = `fingerprint-${values.size + 1}`;
    values.set(serialized, value);
    return value;
  };
}

beforeEach(() => sessionStorage.clear());

describe("IdempotencyKeyManager", () => {
  it("returns the same key for the same body", async () => {
    const manager = new IdempotencyKeyManager(sequentialUuids(), null, fingerprints());
    const first = await manager.getKey({ vehicle: "van", passengers: 2 });
    await expect(manager.getKey({ vehicle: "van", passengers: 2 })).resolves.toBe(first);
  });

  it("returns a new key when any body value changes", async () => {
    const manager = new IdempotencyKeyManager(sequentialUuids(), null, fingerprints());
    const first = await manager.getKey({ vehicle: "van", passengers: 2 });
    const changed = await manager.getKey({ vehicle: "van", passengers: 3 });
    expect(changed).not.toBe(first);
  });

  it.each([
    ["return departure", { return_date: "2026-10-24", large_bags: 1, small_bags: 1 }],
    ["large bags", { return_date: "2026-10-23", large_bags: 2, small_bags: 1 }],
    ["small bags", { return_date: "2026-10-23", large_bags: 1, small_bags: 2 }],
  ])("returns a new key when %s changes", async (_label, changed) => {
    const manager = new IdempotencyKeyManager(sequentialUuids(), null, fingerprints());
    const first = await manager.getKey({
      return_date: "2026-10-23", large_bags: 1, small_bags: 1,
    });
    await expect(manager.getKey(changed)).resolves.not.toBe(first);
  });

  it("ignores object key order, including nested objects", async () => {
    const manager = new IdempotencyKeyManager(sequentialUuids(), null, fingerprints());
    const first = await manager.getKey({ customer: { first: "A", last: "B" }, passengers: 2 });
    const reordered = await manager.getKey({
      passengers: 2, customer: { last: "B", first: "A" },
    });
    expect(reordered).toBe(first);
  });

});

describe("persisted IdempotencyKeyManager", () => {

  it("reuses the key after a page refresh without storing customer data", async () => {
    const fingerprint = fingerprints();
    const body = { customer: { first: "Ada", email: "ada@example.com" }, passengers: 2 };
    const firstManager = new IdempotencyKeyManager(sequentialUuids(), sessionStorage, fingerprint);
    const first = await firstManager.getKey(body);
    const stored = sessionStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
    expect(stored).not.toContain("Ada");
    expect(stored).not.toContain("ada@example.com");

    const secondManager = new IdempotencyKeyManager(
      () => "00000000-0000-4000-8000-999999999999", sessionStorage, fingerprint,
    );
    await expect(secondManager.getKey(body)).resolves.toBe(first);
  });

  it.each([
    ["trip", { trip: "changed", vehicle: "sedan", car_seats: 0, customer: "Ada" }],
    ["vehicle", { trip: "same", vehicle: "van", car_seats: 0, customer: "Ada" }],
    ["car seats", { trip: "same", vehicle: "sedan", car_seats: 1, customer: "Ada" }],
    ["customer", { trip: "same", vehicle: "sedan", car_seats: 0, customer: "Grace" }],
  ])("creates a new key after %s changes", async (_label, changed) => {
    const manager = new IdempotencyKeyManager(sequentialUuids(), null, fingerprints());
    const first = await manager.getKey({
      trip: "same", vehicle: "sedan", car_seats: 0, customer: "Ada",
    });
    await expect(manager.getKey(changed)).resolves.not.toBe(first);
  });
});

