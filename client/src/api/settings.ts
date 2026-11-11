import { api } from './client';
import type { LandlordSettings, UpdateSettingsInput } from '../types/settings';

export const settingsApi = {
    get: async (): Promise<LandlordSettings> => {
        const { data } = await api.get<{ settings: LandlordSettings }>('/settings');
        return data.settings;
    },
    update: async (input: UpdateSettingsInput): Promise<LandlordSettings> => {
        const { data } = await api.put<{ settings: LandlordSettings }>('/settings', input);
        return data.settings;
    },
};
