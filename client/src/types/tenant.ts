export type IdType = 'AADHAAR' | 'OTHER';

export interface TenantBase {
    id: string;
    name: string;
    whatsappNumber: string;
    idType: IdType;
    idNumberLast4: string;
    photoUrl: string | null;
    createdAt: string;
}

export interface CurrentRenter {
    occupancyId: string;
    startDate: string;
    monthlyRentPaise: number;
    paidTillReading: number;
    room: { id: string; roomNumber: string };
    tenant: TenantBase;
}

export interface PreviousRenter extends TenantBase {
    lastStay: {
        occupancyId: string;
        startDate: string;
        endDate: string | null;
        monthlyRentPaise: number;
        room: { id: string; roomNumber: string };
    } | null;
}

export interface TenantOccupancy {
    id: string;
    startDate: string;
    endDate: string | null;
    monthlyRentPaise: number;
    paidTillReading: number;
    room: { id: string; roomNumber: string };
}

export interface TenantDetail extends TenantBase {
    occupancies: TenantOccupancy[];
}

export interface CreateTenantInput {
    name: string;
    whatsappNumber: string;
    idType: IdType;
    idNumber: string;
    monthlyRentPaise: number;
    roomId: string;
    startDate: string; // ISO
    initialReading: number;
    photoFile?: File | null;
}

export interface UpdateTenantInput {
    name?: string;
    whatsappNumber?: string;
    idType?: IdType;
    idNumber?: string;
}

export interface ShiftRoomInput {
    newRoomId: string;
    oldRoomFinalReading: number;
    newRoomInitialReading: number;
    newMonthlyRentPaise?: number;
    shiftDate?: string;
    confirmedRollover?: boolean;
}

export interface MoveOutInput {
    finalReading: number;
    moveOutDate?: string;
    confirmedRollover?: boolean;
}
