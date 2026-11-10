import { api } from './client';
import type { MoveOutInput, ShiftRoomInput } from '../types/tenant';

export const occupanciesApi = {
    shift: async (occupancyId: string, input: ShiftRoomInput): Promise<void> => {
        await api.post(`/occupancies/${occupancyId}/shift`, input);
    },
    moveOut: async (occupancyId: string, input: MoveOutInput): Promise<void> => {
        await api.post(`/occupancies/${occupancyId}/move-out`, input);
    },
};
