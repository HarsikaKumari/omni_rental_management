import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '../api/tenants';
import type { CreateTenantInput, UpdateTenantInput } from '../types/tenant';

const KEYS = {
    current: ['landlord', 'tenants', 'current'] as const,
    previous: ['landlord', 'tenants', 'previous'] as const,
    detail: (id: string) => ['landlord', 'tenants', id] as const,
};

export function useCurrentRenters() {
    return useQuery({ queryKey: KEYS.current, queryFn: tenantsApi.listCurrent });
}

export function usePreviousRenters() {
    return useQuery({ queryKey: KEYS.previous, queryFn: tenantsApi.listPrevious });
}

export function useTenant(id: string) {
    return useQuery({
        queryKey: KEYS.detail(id),
        queryFn: () => tenantsApi.get(id),
        enabled: !!id,
    });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, id?: string) {
    qc.invalidateQueries({ queryKey: KEYS.current });
    qc.invalidateQueries({ queryKey: KEYS.previous });
    qc.invalidateQueries({ queryKey: ['landlord', 'rooms'] });
    if (id) qc.invalidateQueries({ queryKey: KEYS.detail(id) });
}

export function useCreateTenant() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateTenantInput) => tenantsApi.create(input),
        onSuccess: () => invalidateAll(qc),
    });
}

export function useUpdateTenant() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdateTenantInput }) =>
            tenantsApi.update(id, input),
        onSuccess: (_, vars) => invalidateAll(qc, vars.id),
    });
}

export function useUpdateTenantPhoto() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) =>
            tenantsApi.updatePhoto(id, file),
        onSuccess: (_, vars) => invalidateAll(qc, vars.id),
    });
}

export function useRemoveTenantPhoto() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tenantsApi.removePhoto(id),
        onSuccess: (_, id) => invalidateAll(qc, id),
    });
}
