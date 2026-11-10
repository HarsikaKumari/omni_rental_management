import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billsApi } from '../api/bills';
import { paymentsApi } from '../api/payments';
import type { AddPaymentInput, GenerateBillInput } from '../types/bill';

const LIST_KEY = (params?: { status?: string[]; occupancyId?: string }) =>
    ['landlord', 'bills', { status: params?.status?.join(',') ?? '', occupancyId: params?.occupancyId ?? '' }] as const;
const detailKey = (id: string) => ['landlord', 'bills', id] as const;

export function useBills(params?: { status?: string[]; occupancyId?: string; limit?: number }) {
    return useQuery({
        queryKey: LIST_KEY(params),
        queryFn: () => billsApi.list(params),
    });
}

export function useBill(id: string) {
    return useQuery({
        queryKey: detailKey(id),
        queryFn: () => billsApi.get(id),
        enabled: !!id,
    });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, billId?: string) {
    qc.invalidateQueries({ queryKey: ['landlord', 'bills'] });
    qc.invalidateQueries({ queryKey: ['landlord', 'tenants'] });
    qc.invalidateQueries({ queryKey: ['landlord', 'rooms'] });
    if (billId) qc.invalidateQueries({ queryKey: detailKey(billId) });
}

export function useGenerateBill() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: GenerateBillInput) => billsApi.generate(input),
        onSuccess: (data) => invalidateAll(qc, data.billId),
    });
}

export function usePaidTill() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ billId, paidTillReading }: { billId: string; paidTillReading: number }) =>
            billsApi.paidTill(billId, paidTillReading),
        onSuccess: (_, vars) => invalidateAll(qc, vars.billId),
    });
}

export function useMarkFullyPaid() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (billId: string) => billsApi.markFullyPaid(billId),
        onSuccess: (_, billId) => invalidateAll(qc, billId),
    });
}

export function useMarkRentPaid() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (billId: string) => billsApi.markRentPaid(billId),
        onSuccess: (_, billId) => invalidateAll(qc, billId),
    });
}

export function useAddPayment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: AddPaymentInput) => paymentsApi.add(input),
        onSuccess: (_, vars) => invalidateAll(qc, vars.billId),
    });
}
