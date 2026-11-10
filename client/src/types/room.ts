export type RoomStatus = 'VACANT' | 'OCCUPIED';

export interface Room {
  id: string;
  roomNumber: string;
  status: RoomStatus;
  createdAt: string;
}

/**
 * A single stay of a tenant in this room. `endDate === null` means active.
 * Only safe tenant fields are included — no idNumber.
 */
export interface RoomOccupancy {
  id: string;
  startDate: string;
  endDate: string | null;
  monthlyRentPaise: number;
  tenant: {
    id: string;
    name: string;
    whatsappNumber: string;
    photoUrl: string | null;
  };
}

export interface RoomDetail extends Room {
  current: RoomOccupancy | null;
  history: RoomOccupancy[];
}
