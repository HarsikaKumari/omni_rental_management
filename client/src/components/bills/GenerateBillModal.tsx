import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Button, Input, Modal } from "../ui";
import { getApiErrorMessage } from "../../api/client";
import { billsApi } from "../../api/bills";
import { useGenerateBill } from "../../hooks/useBills";
import { formatRupees } from "../../utils/money";
import type { BillPreview } from "../../types/bill";

const schema = z.object({
  type: z.enum(["RENT_AND_ELECTRICITY", "ELECTRICITY_ONLY"]),
  billingMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick a month"),
  currentReading: z.number({ invalid_type_error: "Enter a number" }).min(0),
  confirmedRollover: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

function currentBillingMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface GenerateBillModalProps {
  open: boolean;
  onClose: () => void;
  occupancyId: string;
  roomNumber: string;
  paidTillReading: number;
  ratePerUnitPaise: number;
  defaultType?: "RENT_AND_ELECTRICITY" | "ELECTRICITY_ONLY";
}

export function GenerateBillModal({
  open,
  onClose,
  occupancyId,
  roomNumber,
  paidTillReading,
  ratePerUnitPaise,
  defaultType = "RENT_AND_ELECTRICITY",
}: GenerateBillModalProps) {
  const navigate = useNavigate();
  const generate = useGenerateBill();
  const [preview, setPreview] = useState<BillPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: defaultType,
      billingMonth: currentBillingMonth(),
      currentReading: paidTillReading,
      confirmedRollover: false,
    },
  });

  const watchType = watch("type");
  const watchReading = watch("currentReading");

  // Debounced local preview — no network; mirrors server calc to keep the UI instant.
  const localPreview = useMemo(() => {
    if (!Number.isFinite(watchReading) || watchReading < 0) return null;
    if (ratePerUnitPaise <= 0) return null;
    const units = Math.max(0, watchReading - paidTillReading);
    return {
      units,
      electricityAmountPaise: Math.round(units * ratePerUnitPaise),
    };
  }, [watchReading, paidTillReading, ratePerUnitPaise]);

  // Fetch authoritative preview (validates rollover) once input settles.
  useEffect(() => {
    if (!open) return;
    if (!Number.isFinite(watchReading) || watchReading < 0) return;
    const t = setTimeout(async () => {
      try {
        setPreviewError(null);
        const p = await billsApi.preview({
          occupancyId,
          currentReading: watchReading,
          type: watchType,
        });
        setPreview(p);
      } catch (err) {
        setPreview(null);
        setPreviewError(getApiErrorMessage(err));
      }
    }, 400);
    return () => clearTimeout(t);
  }, [open, occupancyId, watchReading, watchType]);

  const close = () => {
    reset();
    setPreview(null);
    setPreviewError(null);
    generate.reset();
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await generate.mutateAsync({
        occupancyId,
        type: values.type,
        billingMonth: values.billingMonth,
        currentReading: values.currentReading,
        confirmedRollover: values.confirmedRollover,
      });
      close();
      navigate(`/landlord/bills/${result.billId}`);
    } catch (err) {
      setError("root", { message: getApiErrorMessage(err) });
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Generate bill"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={close}>
            Cancel
          </Button>
          <Button form="gen-bill-form" type="submit" loading={isSubmitting}>
            Generate
          </Button>
        </>
      }
    >
      <form
        id="gen-bill-form"
        className="space-y-3"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <p className="text-xs text-slate-500">
          Room {roomNumber} · paid till reading{" "}
          <strong>{paidTillReading}</strong>
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Bill type
          </label>
          <select
            {...register("type")}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base"
          >
            <option value="RENT_AND_ELECTRICITY">Rent + Electricity</option>
            <option value="ELECTRICITY_ONLY">Electricity only</option>
          </select>
        </div>

        <Input
          label="Billing month"
          type="month"
          error={errors.billingMonth?.message}
          {...register("billingMonth")}
        />

        <Input
          label="Current meter reading"
          type="number"
          inputMode="decimal"
          step="0.01"
          error={errors.currentReading?.message}
          {...register("currentReading", { valueAsNumber: true })}
        />

        {localPreview && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <div className="flex justify-between">
              <span>Units</span>
              <span className="font-medium">{localPreview.units}</span>
            </div>
            <div className="flex justify-between">
              <span>Electricity</span>
              <span className="font-medium">
                {formatRupees(localPreview.electricityAmountPaise)}
              </span>
            </div>
          </div>
        )}

        {previewError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {previewError}
          </div>
        )}

        {preview && !preview.valid && (
          <label className="flex items-start gap-2 text-xs text-amber-700">
            <input
              type="checkbox"
              {...register("confirmedRollover")}
              className="mt-0.5"
            />
            <span>
              Confirm meter rollover — new reading is lower than the latest
              recorded ({preview.latestReading}).
            </span>
          </label>
        )}

        {preview && preview.previousRentDuePaise > 0 && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Previous rent due: {formatRupees(preview.previousRentDuePaise)}{" "}
            (carried from older unpaid bills). This is not added to the new
            bill's total.
          </div>
        )}

        {errors.root && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}
      </form>
    </Modal>
  );
}
