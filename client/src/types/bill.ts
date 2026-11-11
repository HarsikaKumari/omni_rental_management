export type BillType = 'RENT_AND_ELECTRICITY' | 'ELECTRICITY_ONLY';
export type BillStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'CARRIED_FORWARD';

export interface BillPayment {
    id: string;
    amountPaise: number;
    paidOn: string;
    note: string | null;
}

export interface BillOccupancySummary {
    id: string;
    paidTillReading: number;
    room: { id: string; roomNumber: string };
    tenant: { id: string; name: string; whatsappNumber?: string };
}

export interface BillListItem {
    id: string;
    type: BillType;
    billingMonth: string;
    isFinal: boolean;
    fromReading: number;
    toReading: number;
    units: number;
    totalPaise: number;
    rentAmountPaise: number;
    electricityAmountPaise: number;
    status: BillStatus;
    rentPaid: boolean;
    createdAt: string;
    occupancy: BillOccupancySummary;
}

export interface BillDetail extends Omit<BillListItem, 'occupancy'> {
    ratePerUnitPaise: number;
    occupancy: BillOccupancySummary & {
        tenant: { id: string; name: string; whatsappNumber: string };
    };
    payments: BillPayment[];
    latestReading: number | null;
    previousRentDuePaise: number;
    previousRentDueBills: { id: string; billingMonth: string; rentAmountPaise: number }[];
}

export interface BillPreview {
    fromReading: number;
    toReading: number;
    units: number;
    ratePerUnitPaise: number;
    meterCapacity: number;
    electricityAmountPaise: number;
    rentAmountPaise: number;
    totalPaise: number;
    latestReading: number;
    valid: boolean;
    readingBehindLatest: boolean;
    requiresRolloverConfirmation: boolean;
    previousRentDuePaise: number;
    previousRentDueBills: { id: string; billingMonth: string; rentAmountPaise: number }[];
}

export interface GenerateBillInput {
    occupancyId: string;
    type: BillType;
    billingMonth: string;
    currentReading: number;
    confirmedRollover?: boolean;
}

export interface AddPaymentInput {
    billId: string;
    amountPaise: number;
    paidOn?: string;
    note?: string;
}