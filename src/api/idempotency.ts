type UuidFactory = () => string;

function sortForSerialization(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForSerialization);
  if (typeof value !== "object" || value === null) return value;

  const source = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    sorted[key] = sortForSerialization(source[key]);
  }
  return sorted;
}

export function stableSerialize(body: object): string {
  return JSON.stringify(sortForSerialization(body));
}

export class IdempotencyKeyManager {
  private serializedBody: string | undefined;
  private key: string | undefined;

  constructor(private readonly createUuid: UuidFactory = () => crypto.randomUUID()) {}

  getKey(body: object): string {
    const serializedBody = stableSerialize(body);
    if (serializedBody === this.serializedBody && this.key !== undefined) return this.key;

    this.serializedBody = serializedBody;
    this.key = this.createUuid();
    return this.key;
  }
}

