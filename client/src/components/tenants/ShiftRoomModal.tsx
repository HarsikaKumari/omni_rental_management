import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Modal } from "../ui";
import { getApiErrorMessage } from "../../api/client";
import { useShiftRoom } from "../../hooks/useOccupancies";
import { rupeesToPaise } from "../../utils/money";
import type { Room } from "../../types/room";

const schema = z.object({
  newRoomId: z.string().min(1, "Select a room"),
  oldRoomFinalReading: z
    .number({ invalid_type_error: "Enter a number" })
    .min(0),
  newRoomInitialReading: z
    .number({ invalid_type_error: "Enter a number" })
    .min(0),
  newRentRupees: z
    .number({ invalid_type_error: "Enter a number" })
    .min(1)
    .optional(),
  confirmedRollover: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  occupancyId: string;
  currentRoomId: string;
  currentRentPaise: number;
  rooms: Room[]; // already filtered by caller to exclude current room
}

export function ShiftRoomModal({
  open,
  onClose,
  occupancyId,
  currentRentPaise,
  rooms,
}: Props) {
  const shift = useShiftRoom();
  const vacant = rooms.filter((r) => r.status === "VACANT");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      newRoomId: "",
      oldRoomFinalReading: undefined as unknown as number,
      newRoomInitialReading: undefined as unknown as number,
      newRentRupees: currentRentPaise / 100,
      confirmedRollover: false,
    },
  });

  const close = () => {
    reset();
    shift.reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await shift.mutateAsync({
        occupancyId,
        input: {
          newRoomId: values.newRoomId,
          oldRoomFinalReading: values.oldRoomFinalReading,
          newRoomInitialReading: values.newRoomInitialReading,
          newMonthlyRentPaise: values.newRentRupees
            ? rupeesToPaise(values.newRentRupees)
            : undefined,
          confirmedRollover: values.confirmedRollover,
        },
      });
      close();
    } catch (err) {
      setError("root", { message: getApiErrorMessage(err) });
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Change room"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={close}>
            Cancel
          </Button>
          <Button form="shift-form" type="submit" loading={isSubmitting}>
            Confirm move
          </Button>
        </>
      }
    >
      <form
        id="shift-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-3"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">
            New room
          </label>
          <select
            {...register("newRoomId")}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base"
          >
            <option value="">Select a vacant room</option>
            {vacant.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.roomNumber}
              </option>
            ))}
          </select>
          {errors.newRoomId && (
            <p className="mt-1 text-xs text-red-600">
              {errors.newRoomId.message}
            </p>
          )}
        </div>

        <Input
          label="Old room final reading"
          type="number"
          inputMode="decimal"
          step="0.01"
          error={errors.oldRoomFinalReading?.message}
          {...register("oldRoomFinalReading", { valueAsNumber: true })}
        />
        <Input
          label="New room initial reading"
          type="number"
          inputMode="decimal"
          step="0.01"
          error={errors.newRoomInitialReading?.message}
          {...register("newRoomInitialReading", { valueAsNumber: true })}
        />
        <Input
          label="New monthly rent (₹, optional)"
          type="number"
          inputMode="decimal"
          step="0.01"
          helper="Leave unchanged to keep the same rent"
          error={errors.newRentRupees?.message}
          {...register("newRentRupees", { valueAsNumber: true })}
        />

        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            {...register("confirmedRollover")}
            className="mt-0.5"
          />
          <span>
            Confirm meter rollover — final reading is lower than the latest
            reading on the current room (meter wrapped past 99999).
          </span>
        </label>

        {errors.root && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}
      </form>
    </Modal>
  );
}
