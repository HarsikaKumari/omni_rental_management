import { api } from './client';
import type {
    BillDetail,
    BillListItem,
    BillPreview,
    GenerateBillInput,
} from '../types/bill';

export const billsApi = {
    preview: async (input: {
        occupancyId: string;
        currentReading: number;
        type: 'RENT_AND_ELECTRICITY' | 'ELECTRICITY_ONLY';
    }): Promise<BillPreview> => {
        const { data } = await api.post<{ preview: BillPreview }>('/bills/preview', input);
        return data.preview;
    },

    generate: async (input: GenerateBillInput): Promise<{ billId: string }> => {
        const { data } = await api.post<{ billId: string }>('/bills', input);
        return data;
    },

    list: async (params?: {
        status?: string[];
        occupancyId?: string;
        limit?: number;
    }): Promise<BillListItem[]> => {
        const query: Record<string, string> = {};
        if (params?.status?.length) query.status = params.status.join(',');
        if (params?.occupancyId) query.occupancyId = params.occupancyId;
        if (params?.limit) query.limit = String(params.limit);

        const { data } = await api.get<{ bills: BillListItem[] }>('/bills', { params: query });
        return data.bills;
    },

    get: async (id: string): Promise<BillDetail> => {
        const { data } = await api.get<{ bill: BillDetail }>(`/bills/${id}`);
        return data.bill;
    },

    paidTill: async (id: string, paidTillReading: number): Promise<void> => {
        await api.post(`/bills/${id}/paid-till`, { paidTillReading });
    },

    markFullyPaid: async (id: string): Promise<void> => {
        await api.post(`/bills/${id}/mark-paid`);
    },

    markRentPaid: async (id: string): Promise<void> => {
        await api.post(`/bills/${id}/rent-paid`);
    },
};
