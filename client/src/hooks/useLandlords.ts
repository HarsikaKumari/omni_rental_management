import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/landlords';
import type { CreateLandlordInput, UpdateLandlordInput } from '../types/landlord';

const KEYS = {
    stats: ['admin', 'stats'] as const,
    landlords: (search?: string) => ['admin', 'landlords', { search: search ?? '' }] as const,
};

export function useAdminStats() {
    return useQuery({
        queryKey: KEYS.stats,
        queryFn: adminApi.stats,
    });
}

export function useLandlords(search?: string) {
    return useQuery({
        queryKey: KEYS.landlords(search),
        queryFn: () => adminApi.listLandlords(search),
    });
}

export function useCreateLandlord() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateLandlordInput) => adminApi.createLandlord(input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin'] });
        },
    });
}

export function useUpdateLandlord() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdateLandlordInput }) =>
            adminApi.updateLandlord(id, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin'] });
        },
    });
}

export function useDeleteLandlord() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminApi.deleteLandlord(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin'] });
        },
    });
}
