export function formatPercent(value: string): string {
  const parts = value.split(".");
  if (parts.length !== 2) return value;
  const fraction = parts[1]?.replace(/0+$/, "") ?? "";
  return fraction === "" ? (parts[0] ?? value) : `${parts[0]}.${fraction}`;
}
