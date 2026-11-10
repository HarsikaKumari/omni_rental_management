/**
 * Normalize a user-entered WhatsApp number to E.164 (+<country><number>).
 * - Strips spaces, dashes, parens.
 * - If bare 10 digits: assumed Indian (+91).
 * - If bare 11–15 digits: assumed to already include country code, prefixes "+".
 * - Otherwise must already start with "+".
 * Throws on anything else.
 */
export function normalizeWhatsappNumber(input: string): string {
    const cleaned = input.trim().replace(/[\s\-()]/g, '');

    let normalized = cleaned;
    if (!normalized.startsWith('+')) {
        if (/^\d{10}$/.test(normalized)) {
            normalized = `+91${normalized}`;
        } else if (/^\d{11,15}$/.test(normalized)) {
            normalized = `+${normalized}`;
        } else {
            throw new Error('WhatsApp number must be 10–15 digits, optionally starting with +');
        }
    }

    if (!/^\+[1-9]\d{9,14}$/.test(normalized)) {
        throw new Error('Invalid WhatsApp number');
    }
    return normalized;
}

/** True if the string already looks like E.164. */
export function isE164(s: string): boolean {
    return /^\+[1-9]\d{9,14}$/.test(s);
}