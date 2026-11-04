/**
 * Money is ALWAYS an integer number of paise. Rupees are only a display concern.
 * 1 rupee = 100 paise.
 */

/** Convert integer paise to a rupee number (may include fractional paise). */
export const paiseToRupees = (paise: number): number => paise / 100;

/** Convert a rupee amount (may be fractional) to integer paise, rounding half up. */
export const rupeesToPaise = (rupees: number): number => Math.round(rupees * 100);

/** Round a raw paise value to the nearest integer paise (defensive). */
export const roundPaise = (paise: number): number => Math.round(paise);

/**
 * Electricity amount in paise. units * ratePerUnitPaise, rounded to nearest paise.
 * Pure and unit-testable (Phase 6 uses this).
 */
export const calcElectricityAmountPaise = (
  units: number,
  ratePerUnitPaise: number,
): number => Math.round(units * ratePerUnitPaise);