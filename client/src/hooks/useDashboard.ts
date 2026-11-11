import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';

export function useDashboard() {
    return useQuery({
        queryKey: ['landlord', 'dashboard'],
        queryFn: dashboardApi.get,
        // Dashboard is the landing page — refetch on focus so returning from
        // a bill edit reflects the new totals immediately.
        refetchOnWindowFocus: true,
    });
}
