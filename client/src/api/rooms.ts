import { api } from './client';
import type { Room, RoomDetail } from '../types/room';

export const roomsApi = {
    list: async (): Promise<Room[]> => {
        const { data } = await api.get<{ rooms: Room[] }>('/rooms');
        return data.rooms;
    },
    get: async (id: string): Promise<RoomDetail> => {
        const { data } = await api.get<{ room: RoomDetail }>(`/rooms/${id}`);
        return data.room;
    },
    create: async (roomNumber: string): Promise<Room> => {
        const { data } = await api.post<{ room: Room }>('/rooms', { roomNumber });
        return data.room;
    },
    update: async (id: string, roomNumber: string): Promise<Room> => {
        const { data } = await api.patch<{ room: Room }>(`/rooms/${id}`, { roomNumber });
        return data.room;
    },
};
