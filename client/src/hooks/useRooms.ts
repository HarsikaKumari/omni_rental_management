import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roomsApi } from '../api/rooms';

const KEY = ['landlord', 'rooms'] as const;

export function useRooms() {
    return useQuery({ queryKey: KEY, queryFn: roomsApi.list });
}

export function useCreateRoom() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (roomNumber: string) => roomsApi.create(roomNumber),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEY });
        },
    });
}

export function useUpdateRoom() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, roomNumber }: { id: string; roomNumber: string }) =>
            roomsApi.update(id, roomNumber),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEY });
        },
    });
}

export function useDeleteRoom() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => roomsApi.remove(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEY });
        },
    });
}