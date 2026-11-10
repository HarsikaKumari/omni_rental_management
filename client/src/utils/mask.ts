/** `1234` → `•••• 1234` */
export function maskIdNumber(last4: string): string {
    return `•••• ${last4}`;
}