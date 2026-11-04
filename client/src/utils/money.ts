/**
 * All money is passed around as integer paise. Only the UI converts to rupees.
 */
export const paiseToRupees = (paise: number): number => paise / 100;

export const rupeesToPaise = (rupees: number): number => Math.round(rupees * 100);

/**
 * Format paise as a ₹ string with 2 decimals, e.g. ₹1,234.50.
 * Uses Intl.NumberFormat so thousands separators are locale-correct.
 */
export const formatRupees = (paise: number): string =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(paiseToRupees(paise));