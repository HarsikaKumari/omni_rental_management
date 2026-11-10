import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roomsApi } from '../api/rooms';

const LIST_KEY = ['landlord', 'rooms'] as const;
const detailKey = (id: string) => ['landlord', 'rooms', id] as const;

export function useRooms() {
    return useQuery({ queryKey: LIST_KEY, queryFn: roomsApi.list });
}

export function useRoom(id: string) {
    return useQuery({
        queryKey: detailKey(id),
        queryFn: () => roomsApi.get(id),
        enabled: !!id,
    });
}

export function useCreateRoom() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (roomNumber: string) => roomsApi.create(roomNumber),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: LIST_KEY });
        },
    });
}

export function useUpdateRoom() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, roomNumber }: { id: string; roomNumber: string }) =>
            roomsApi.update(id, roomNumber),
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: LIST_KEY });
            qc.invalidateQueries({ queryKey: detailKey(vars.id) });
        },
    });
}
