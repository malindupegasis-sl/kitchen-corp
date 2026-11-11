/** Format a GBP amount with no decimals, e.g. 18000000 -> "£18,000,000". */
export function formatGbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}
