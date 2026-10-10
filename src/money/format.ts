const MONEY_PATTERN = /^-?\d+\.\d{2}$/;

function invalidMoney(amount: string): string {
  if (import.meta.env.PROD) return "—";
  throw new Error(`Invalid money amount: ${amount}`);
}

export function formatMoney(amount: string, currency: "USD"): string {
  if (!MONEY_PATTERN.test(amount)) return invalidMoney(amount);

  const negative = amount.startsWith("-");
  const unsigned = negative ? amount.slice(1) : amount;
  const [whole, cents] = unsigned.split(".");
  const grouped = whole?.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = negative ? "-" : "";
  const symbol = currency === "USD" ? "$" : "";
  return `${sign}${symbol}${grouped}.${cents}`;
}

