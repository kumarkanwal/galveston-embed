import { describe, expect, it } from "vitest";

import { IdempotencyKeyManager } from "../src/api/idempotency";

function sequentialUuids() {
  let next = 0;
  return () => `00000000-0000-4000-8000-00000000000${++next}`;
}

describe("IdempotencyKeyManager", () => {
  it("returns the same key for the same body", () => {
    const manager = new IdempotencyKeyManager(sequentialUuids());
    expect(manager.getKey({ vehicle: "van", passengers: 2 })).toBe(
      manager.getKey({ vehicle: "van", passengers: 2 }),
    );
  });

  it("returns a new key when any body value changes", () => {
    const manager = new IdempotencyKeyManager(sequentialUuids());
    const first = manager.getKey({ vehicle: "van", passengers: 2 });
    const changed = manager.getKey({ vehicle: "van", passengers: 3 });
    expect(changed).not.toBe(first);
  });

  it("ignores object key order, including nested objects", () => {
    const manager = new IdempotencyKeyManager(sequentialUuids());
    const first = manager.getKey({ customer: { first: "A", last: "B" }, passengers: 2 });
    const reordered = manager.getKey({ passengers: 2, customer: { last: "B", first: "A" } });
    expect(reordered).toBe(first);
  });
});

