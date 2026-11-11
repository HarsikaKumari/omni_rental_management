import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AppShell } from '../../components/layout/AppShell';
import { LandlordNav } from '../../components/layout/LandlordNav';
import { Button, Card, Input, Spinner } from '../../components/ui';
import { getApiErrorMessage } from '../../api/client';
import { useSettings, useUpdateSettings } from '../../hooks/useSettings';
import { paiseToRupees, rupeesToPaise } from '../../utils/money';

const schema = z.object({
  rateRupees: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0.01, 'Rate must be at least ₹0.01')
    .max(1000, 'Rate cannot exceed ₹1000 per unit'),
  meterCapacity: z
    .number({ invalid_type_error: 'Enter a number' })
    .int('Must be a whole number')
    .min(1000, 'Capacity must be at least 1000')
    .max(1_000_000, 'Capacity cannot exceed 1,000,000'),
});
type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const settings = useSettings();
  const update = useUpdateSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rateRupees: 0, meterCapacity: 99999 },
  });

  useEffect(() => {
    if (settings.data) {
      reset({
        rateRupees: paiseToRupees(settings.data.ratePerUnitPaise),
        meterCapacity: settings.data.meterCapacity,
      });
    }
  }, [settings.data, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await update.mutateAsync({
        ratePerUnitPaise: rupeesToPaise(values.rateRupees),
        meterCapacity: values.meterCapacity,
      });
      reset(values);
    } catch (err) {
      setError('root', { message: getApiErrorMessage(err) });
    }
  };

  return (
    <AppShell title="Settings" bottomNav={<LandlordNav />}>
      <div className="mx-auto w-full max-w-md space-y-4">
        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Billing</h2>
          <p className="mt-1 text-xs text-slate-500">
            Each bill snapshots the rate — future changes never alter old bills.
          </p>

          {settings.isLoading ? (
            <div className="mt-4 flex justify-center">
              <Spinner />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-3">
              <Input
                label="Rate per unit (₹)"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="8.75"
                error={errors.rateRupees?.message}
                {...register('rateRupees', { valueAsNumber: true })}
              />
              <Input
                label="Meter capacity"
                type="number"
                inputMode="numeric"
                step="1"
                placeholder="99999"
                helper="Highest number on the meter (5-digit = 99999, 4-digit = 9999). Used for rollover."
                error={errors.meterCapacity?.message}
                {...register('meterCapacity', { valueAsNumber: true })}
              />
              {settings.isError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {getApiErrorMessage(settings.error)}
                </div>
              )}
              {errors.root && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errors.root.message}
                </div>
              )}
              <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
                Save
              </Button>
            </form>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
