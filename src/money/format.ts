const MONEY_PATTERN = /^-?\d+\.\d{2}$/;

function invalidMoney(amount: string): string {
  if (import.meta.env.PROD) return "—";
  throw new Error(`Invalid money amount: ${amount}`);
}

function formattedAmount(amount: string, currency: string): string | null {
  if (!MONEY_PATTERN.test(amount)) return null;
  const negative = amount.startsWith("-");
  const unsigned = negative ? amount.slice(1) : amount;
  const [whole, cents] = unsigned.split(".");
  const grouped = whole?.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = negative ? "-" : "";
  const symbol = currency === "USD" ? "$" : "";
  return `${sign}${symbol}${grouped}.${cents}`;
}

export function formatMoneyAmount(amount: string, currency: string): string {
  return formattedAmount(amount, currency) ?? invalidMoney(amount);
}

export function formatMoney(amount: string, currency: string): string {
  const formatted = formattedAmount(amount, currency);
  return formatted === null ? invalidMoney(amount) : `${formatted} ${currency}`;
}

