import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import type { UpdateSettingsInput } from '../types/settings';

const KEY = ['landlord', 'settings'] as const;

export function useSettings() {
    return useQuery({ queryKey: KEY, queryFn: settingsApi.get });
}

export function useUpdateSettings() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: UpdateSettingsInput) => settingsApi.update(input),
        onSuccess: (data) => {
            qc.setQueryData(KEY, data);
        },
    });
}
