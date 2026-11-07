import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';

const KEY = ['landlord', 'settings'] as const;

export function useSettings() {
    return useQuery({ queryKey: KEY, queryFn: settingsApi.get });
}

export function useUpdateSettings() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (ratePerUnitPaise: number) => settingsApi.update(ratePerUnitPaise),
        onSuccess: (data) => {
            // Server already returns the new settings object — write it directly
            // instead of invalidating, so the dashboard rate updates instantly.
            qc.setQueryData(KEY, data);
        },
    });
}
