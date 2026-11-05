export type LandlordStatus = 'ACTIVE' | 'SUSPENDED';

export interface LandlordSummary {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: LandlordStatus;
    createdAt: string;
}

export interface AdminStats {
    totalLandlords: number;
    activeLandlords: number;
    suspendedLandlords: number;
    totalRooms: number;
    activeRenters: number;
}

export interface CreateLandlordInput {
    name: string;
    email: string;
    phone: string;
    password: string;
}

export interface UpdateLandlordInput {
    name?: string;
    email?: string;
    phone?: string;
    status?: LandlordStatus;
}
