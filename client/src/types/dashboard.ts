import type { BillStatus } from './bill';

export interface RecentBillSummary {
    id: string;
    billingMonth: string;
    status: BillStatus;
    totalPaise: number;
    isFinal: boolean;
    tenantName: string;
    roomNumber: string;
}

export interface DashboardData {
    occupiedRooms: number;
    vacantRooms: number;
    totalRooms: number;
    ratePerUnitPaise: number;
    meterCapacity: number;
    totalRentDuePaise: number;
    totalElectricityDuePaise: number;
    totalDuePaise: number;
    recentBills: RecentBillSummary[];
}
