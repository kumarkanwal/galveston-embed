type UuidFactory = () => string;
type FingerprintFactory = (body: object) => Promise<string>;

export const IDEMPOTENCY_STORAGE_KEY = "galveston-booking-idempotency";

interface StoredKey {
  fingerprint: string;
  key: string;
}

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

export async function fingerprintBody(body: object): Promise<string> {
  const bytes = new TextEncoder().encode(stableSerialize(body));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function availableSessionStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function readStoredKey(storage: Storage | null): StoredKey | null {
  if (storage === null) return null;
  try {
    const value = JSON.parse(storage.getItem(IDEMPOTENCY_STORAGE_KEY) ?? "null") as unknown;
    if (typeof value !== "object" || value === null) return null;
    const record = value as Record<string, unknown>;
    return typeof record.fingerprint === "string" && typeof record.key === "string"
      ? { fingerprint: record.fingerprint, key: record.key }
      : null;
  } catch {
    return null;
  }
}

function writeStoredKey(storage: Storage | null, value: StoredKey): void {
  try {
    storage?.setItem(IDEMPOTENCY_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // In-memory idempotency still protects the active page when storage is unavailable.
  }
}

export class IdempotencyKeyManager {
  private fingerprint: string | undefined;
  private key: string | undefined;

  constructor(
    private readonly createUuid: UuidFactory = () => crypto.randomUUID(),
    private readonly storage: Storage | null = availableSessionStorage(),
    private readonly createFingerprint: FingerprintFactory = fingerprintBody,
  ) {}

  async getKey(body: object): Promise<string> {
    const fingerprint = await this.createFingerprint(body);
    if (fingerprint === this.fingerprint && this.key !== undefined) return this.key;

    const stored = readStoredKey(this.storage);
    if (stored?.fingerprint === fingerprint) {
      this.fingerprint = fingerprint;
      this.key = stored.key;
      return stored.key;
    }

    this.fingerprint = fingerprint;
    this.key = this.createUuid();
    writeStoredKey(this.storage, { fingerprint, key: this.key });
    return this.key;
  }
}

