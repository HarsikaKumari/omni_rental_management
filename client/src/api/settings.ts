import { api } from './client';
import type { LandlordSettings } from '../types/settings';

export const settingsApi = {
    get: async (): Promise<LandlordSettings> => {
        const { data } = await api.get<{ settings: LandlordSettings }>('/settings');
        return data.settings;
    },
    update: async (ratePerUnitPaise: number): Promise<LandlordSettings> => {
        const { data } = await api.put<{ settings: LandlordSettings }>('/settings', {
            ratePerUnitPaise,
        });
        return data.settings;
    },
};
