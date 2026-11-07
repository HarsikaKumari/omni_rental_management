export type RoomStatus = 'VACANT' | 'OCCUPIED';

export interface Room {
    id: string;
    roomNumber: string;
    status: RoomStatus;
    createdAt: string;
}
