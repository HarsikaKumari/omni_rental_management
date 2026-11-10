import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Modal } from "../ui";
import { getApiErrorMessage } from "../../api/client";
import { usePaidTill } from "../../hooks/useBills";

const schema = z.object({
  paidTillReading: z.number({ invalid_type_error: "Enter a number" }).min(0),
});
type FormValues = z.infer<typeof schema>;

export function PaidTillModal({
  open,
  onClose,
  billId,
  currentPaidTill,
  latestReading,
}: {
  open: boolean;
  onClose: () => void;
  billId: string;
  currentPaidTill: number;
  latestReading: number | null;
}) {
  const paidTill = usePaidTill();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { paidTillReading: currentPaidTill },
  });

  const close = () => {
    reset();
    paidTill.reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await paidTill.mutateAsync({
        billId,
        paidTillReading: values.paidTillReading,
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
      title="Record paid-till reading"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={close}>
            Cancel
          </Button>
          <Button form="paid-till-form" type="submit" loading={isSubmitting}>
            Record
          </Button>
        </>
      }
    >
      <form
        id="paid-till-form"
        className="space-y-3"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <p className="text-sm text-slate-700">
          Current paid-till: <strong>{currentPaidTill}</strong>
          {latestReading !== null && (
            <>
              {" "}
              · Latest reading: <strong>{latestReading}</strong>
            </>
          )}
        </p>
        <Input
          label="New paid-till reading"
          type="number"
          inputMode="decimal"
          step="0.01"
          error={errors.paidTillReading?.message}
          {...register("paidTillReading", { valueAsNumber: true })}
        />
        <p className="text-xs text-slate-500">
          The difference will be logged as a payment at the bill's original
          rate.
        </p>
        {errors.root && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}
      </form>
    </Modal>
  );
}
