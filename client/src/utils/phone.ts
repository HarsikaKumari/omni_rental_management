/**
 * Same rules as the server: normalize to E.164 (+<country><digits>).
 * Used for client-side preview/validation before POSTing.
 */
export function normalizeWhatsappNumber(input: string): string {
    const cleaned = input.trim().replace(/[\s\-()]/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('+')) return cleaned;
    if (/^\d{10}$/.test(cleaned)) return `+91${cleaned}`;
    if (/^\d{11,15}$/.test(cleaned)) return `+${cleaned}`;
    return cleaned; // let server reject invalid formats
}

export function isE164(s: string): boolean {
    return /^\+[1-9]\d{9,14}$/.test(s);
}