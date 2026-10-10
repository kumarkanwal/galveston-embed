// TEMPORARY until B-21: replace with the generated ServiceTypeOption type.
export interface ServiceTypeOption {
  id: string;
  code: string;
  name: string;
  minimum_hours?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMinimumHours(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isInteger(value));
}

export function isServiceTypeOption(value: unknown): value is ServiceTypeOption {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.code === "string" &&
    typeof value.name === "string" &&
    isMinimumHours(value.minimum_hours)
  );
}

export function validateServiceTypes(values: unknown[]): ServiceTypeOption[] {
  return values.filter(isServiceTypeOption);
}
