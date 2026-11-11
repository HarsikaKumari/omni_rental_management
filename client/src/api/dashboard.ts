import { api } from './client';
import type { DashboardData } from '../types/dashboard';

export const dashboardApi = {
    get: async (): Promise<DashboardData> => {
        const { data } = await api.get<DashboardData>('/dashboard');
        return data;
    },
};
