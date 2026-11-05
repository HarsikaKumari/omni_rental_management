import { api } from './client';
import type {
    AdminStats,
    CreateLandlordInput,
    LandlordSummary,
    UpdateLandlordInput,
} from '../types/landlord';

export const adminApi = {
    stats: async (): Promise<AdminStats> => {
        const { data } = await api.get<AdminStats>('/admin/stats');
        return data;
    },

    listLandlords: async (search?: string): Promise<LandlordSummary[]> => {
        const { data } = await api.get<{ landlords: LandlordSummary[] }>('/admin/landlords', {
            params: search ? { search } : undefined,
        });
        return data.landlords;
    },

    createLandlord: async (input: CreateLandlordInput): Promise<LandlordSummary> => {
        const { data } = await api.post<{ landlord: LandlordSummary }>('/admin/landlords', input);
        return data.landlord;
    },

    updateLandlord: async (
        id: string,
        input: UpdateLandlordInput,
    ): Promise<LandlordSummary> => {
        const { data } = await api.patch<{ landlord: LandlordSummary }>(
            `/admin/landlords/${id}`,
            input,
        );
        return data.landlord;
    },

    deleteLandlord: async (id: string): Promise<void> => {
        await api.delete(`/admin/landlords/${id}`);
    },
};
