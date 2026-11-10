/**
 * Return the last 4 alphanumeric characters of an ID number for masking.
 * Example: "123456789012" → "9012"; "ABCD-1234" → "1234".
 * Never returns more than 4 chars, so UI shows `•••• 9012` safely.
 */
export function last4(idNumber: string): string {
    const alnum = idNumber.replace(/[^A-Za-z0-9]/g, '');
    return alnum.slice(-4).padStart(4, '•');
}
