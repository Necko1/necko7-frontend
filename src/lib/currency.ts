/**
 * Utility functions for handling currency conversions and formatting.
 *
 * In rewards and redemptions, price is stored in minor units:
 * - For RUB: 100 minor units = 1 RUB (divide by 100)
 * - For USD and EUR: 1000 minor units = 1 USD / EUR (divide by 1000)
 */

export function getCurrencyDivisor(currency?: string | null): number {
  const cur = currency?.toUpperCase();
  if (cur === "USD" || cur === "EUR") {
    return 1000;
  }
  return 100;
}

export function minorToMajor(minor: number, currency?: string | null): number {
  const divisor = getCurrencyDivisor(currency);
  return minor / divisor;
}

export function formatMajorCurrency(amount: number, currency?: string | null): string {
  const cur = currency?.toUpperCase() || "RUB";
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (cur === "RUB") return `₽${formatted}`;
  if (cur === "USD") return `$${formatted}`;
  if (cur === "EUR") return `€${formatted}`;
  return `${formatted} ${cur}`;
}

export function formatMinorCurrency(minor: number, currency?: string | null): string {
  return formatMajorCurrency(minorToMajor(minor, currency), currency);
}
