import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Modal } from "../ui";
import { getApiErrorMessage } from "../../api/client";
import { useMoveOut } from "../../hooks/useOccupancies";

const schema = z.object({
  finalReading: z.number({ invalid_type_error: "Enter a number" }).min(0),
  moveOutDate: z.string().optional(),
  confirmedRollover: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

function todayIsoDate(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function MoveOutModal({
  open,
  onClose,
  occupancyId,
  onMovedOut,
}: {
  open: boolean;
  onClose: () => void;
  occupancyId: string;
  onMovedOut?: () => void;
}) {
  const moveOut = useMoveOut();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      finalReading: undefined as unknown as number,
      moveOutDate: todayIsoDate(),
      confirmedRollover: false,
    },
  });

  const close = () => {
    reset();
    moveOut.reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await moveOut.mutateAsync({
        occupancyId,
        input: {
          finalReading: values.finalReading,
          moveOutDate: values.moveOutDate
            ? new Date(values.moveOutDate).toISOString()
            : undefined,
          confirmedRollover: values.confirmedRollover,
        },
      });
      close();
      onMovedOut?.();
    } catch (err) {
      setError("root", { message: getApiErrorMessage(err) });
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Move out renter"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={close}>
            Cancel
          </Button>
          <Button
            form="move-out-form"
            type="submit"
            variant="danger"
            loading={isSubmitting}
          >
            Confirm move-out
          </Button>
        </>
      }
    >
      <form
        id="move-out-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-3"
      >
        <p className="text-sm text-slate-700">
          The room becomes vacant and this renter moves to Previous renters.
          Nothing is deleted — their history stays available.
        </p>
        <Input
          label="Final meter reading"
          type="number"
          inputMode="decimal"
          step="0.01"
          error={errors.finalReading?.message}
          {...register("finalReading", { valueAsNumber: true })}
        />
        <Input label="Move-out date" type="date" {...register("moveOutDate")} />
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            {...register("confirmedRollover")}
            className="mt-0.5"
          />
          <span>
            Confirm meter rollover — final reading is lower than the latest
            recorded reading.
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
