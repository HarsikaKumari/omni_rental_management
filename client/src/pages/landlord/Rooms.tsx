import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "../../components/layout/AppShell";
import { LandlordNav } from "../../components/layout/LandlordNav";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Spinner,
} from "../../components/ui";
import { getApiErrorMessage } from "../../api/client";
import {
  useCreateRoom,
  useDeleteRoom,
  useRooms,
  useUpdateRoom,
} from "../../hooks/useRooms";
import type { Room } from "../../types/room";

const schema = z.object({
  roomNumber: z.string().trim().min(1, "Room number is required").max(20),
});
type FormValues = z.infer<typeof schema>;

// Natural sort so "Room 2" comes before "Room 10".
const naturalSort = (a: Room, b: Room) =>
  a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });

export default function RoomsPage() {
  const roomsQuery = useRooms();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState<Room | null>(null);

  const sortedRooms = roomsQuery.data
    ? [...roomsQuery.data].sort(naturalSort)
    : [];

  return (
    <AppShell title="Rooms" bottomNav={<LandlordNav />}>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {sortedRooms.length} room{sortedRooms.length === 1 ? "" : "s"}
          </p>
          <Button onClick={() => setCreateOpen(true)}>New room</Button>
        </div>

        {roomsQuery.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {roomsQuery.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {getApiErrorMessage(roomsQuery.error)}
          </div>
        )}

        {!roomsQuery.isLoading && sortedRooms.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">
              No rooms yet. Add your first room to allot it to a renter.
            </p>
          </Card>
        )}

        <div className="space-y-3">
          {sortedRooms.map((room) => (
            <Card key={room.id}>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Room {room.roomNumber}
                </h3>
                <Badge tone={room.status === "OCCUPIED" ? "blue" : "green"}>
                  {room.status}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditing(room)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => setDeleting(room)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <RoomFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        mode="create"
      />
      <RoomFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        mode="edit"
        room={editing ?? undefined}
      />
      <DeleteRoomModal room={deleting} onClose={() => setDeleting(null)} />
    </AppShell>
  );
}

function RoomFormModal({
  open,
  onClose,
  mode,
  room,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  room?: Room;
}) {
  const create = useCreateRoom();
  const update = useUpdateRoom();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: room ? { roomNumber: room.roomNumber } : { roomNumber: "" },
  });

  const close = () => {
    reset();
    create.reset();
    update.reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (mode === "create") {
        await create.mutateAsync(values.roomNumber);
      } else if (room) {
        await update.mutateAsync({
          id: room.id,
          roomNumber: values.roomNumber,
        });
      }
      close();
    } catch (err) {
      setError("root", { message: getApiErrorMessage(err) });
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={mode === "create" ? "New room" : "Edit room"}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={close}>
            Cancel
          </Button>
          <Button form="room-form" type="submit" loading={isSubmitting}>
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </>
      }
    >
      <form
        id="room-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-3"
      >
        <Input
          label="Room number"
          placeholder="e.g. 101 or A1"
          autoFocus
          error={errors.roomNumber?.message}
          {...register("roomNumber")}
        />
        {errors.root && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}
      </form>
    </Modal>
  );
}

function DeleteRoomModal({
  room,
  onClose,
}: {
  room: Room | null;
  onClose: () => void;
}) {
  const del = useDeleteRoom();
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    del.reset();
    onClose();
  };

  const confirm = async () => {
    if (!room) return;
    try {
      await del.mutateAsync(room.id);
      close();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Modal
      open={!!room}
      onClose={close}
      title="Delete room?"
      footer={
        <>
          <Button variant="ghost" onClick={close} type="button">
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={del.isPending}>
            Delete
          </Button>
        </>
      }
    >
      {room && (
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            Delete <strong>Room {room.roomNumber}</strong>?
          </p>
          <p className="text-slate-500">
            Rooms with any renter history (past or current) cannot be deleted —
            this preserves your records.
          </p>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
