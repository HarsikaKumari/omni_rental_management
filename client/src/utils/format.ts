export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function formatDateRange(startIso: string, endIso: string | null): string {
    const start = formatDate(startIso);
    if (!endIso) return `${start} → present`;
    return `${start} → ${formatDate(endIso)}`;
}

/** Whole months between two ISO dates, using "now" for open-ended stays. */
export function monthsBetween(startIso: string, endIso: string | null): number {
    const start = new Date(startIso);
    const end = endIso ? new Date(endIso) : new Date();
    const months =
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(months, 1);
}