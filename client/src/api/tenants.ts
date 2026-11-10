import { api } from './client';
import type {
    CreateTenantInput,
    CurrentRenter,
    PreviousRenter,
    TenantDetail,
    UpdateTenantInput,
} from '../types/tenant';

export const tenantsApi = {
    listCurrent: async (): Promise<CurrentRenter[]> => {
        const { data } = await api.get<{ renters: CurrentRenter[] }>('/tenants/current');
        return data.renters;
    },

    listPrevious: async (): Promise<PreviousRenter[]> => {
        const { data } = await api.get<{ renters: PreviousRenter[] }>('/tenants/previous');
        return data.renters;
    },

    get: async (id: string): Promise<TenantDetail> => {
        const { data } = await api.get<{ tenant: TenantDetail }>(`/tenants/${id}`);
        return data.tenant;
    },

    create: async (input: CreateTenantInput): Promise<TenantDetail> => {
        const fd = new FormData();
        fd.append('name', input.name);
        fd.append('whatsappNumber', input.whatsappNumber);
        fd.append('idType', input.idType);
        fd.append('idNumber', input.idNumber);
        fd.append('monthlyRentPaise', String(input.monthlyRentPaise));
        fd.append('roomId', input.roomId);
        fd.append('startDate', input.startDate);
        fd.append('initialReading', String(input.initialReading));
        if (input.photoFile) fd.append('photo', input.photoFile);

        // Content-Type is set automatically by axios for FormData.
        const { data } = await api.post<{ tenant: TenantDetail }>('/tenants', fd);
        return data.tenant;
    },

    update: async (id: string, input: UpdateTenantInput): Promise<TenantDetail> => {
        const { data } = await api.patch<{ tenant: TenantDetail }>(`/tenants/${id}`, input);
        return data.tenant;
    },

    updatePhoto: async (id: string, file: File): Promise<TenantDetail> => {
        const fd = new FormData();
        fd.append('photo', file);
        const { data } = await api.put<{ tenant: TenantDetail }>(`/tenants/${id}/photo`, fd);
        return data.tenant;
    },

    removePhoto: async (id: string): Promise<void> => {
        await api.delete(`/tenants/${id}/photo`);
    },
};
