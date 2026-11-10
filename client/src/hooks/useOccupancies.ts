import { useMutation, useQueryClient } from '@tanstack/react-query';
import { occupanciesApi } from '../api/occupancies';
import type { MoveOutInput, ShiftRoomInput } from '../types/tenant';

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
    qc.invalidateQueries({ queryKey: ['landlord', 'tenants'] });
    qc.invalidateQueries({ queryKey: ['landlord', 'rooms'] });
}

export function useShiftRoom() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ occupancyId, input }: { occupancyId: string; input: ShiftRoomInput }) =>
            occupanciesApi.shift(occupancyId, input),
        onSuccess: () => invalidateAll(qc),
    });
}

export function useMoveOut() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ occupancyId, input }: { occupancyId: string; input: MoveOutInput }) =>
            occupanciesApi.moveOut(occupancyId, input),
        onSuccess: () => invalidateAll(qc),
    });
}
