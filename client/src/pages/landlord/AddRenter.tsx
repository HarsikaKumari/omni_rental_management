import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { AppShell } from '../../components/layout/AppShell';
import { LandlordNav } from '../../components/layout/LandlordNav';
import { Button, Card, Input, Spinner } from '../../components/ui';
import { getApiErrorMessage } from '../../api/client';
import { useRooms } from '../../hooks/useRooms';
import { useCreateTenant } from '../../hooks/useTenants';
import { normalizeWhatsappNumber, isE164 } from '../../utils/phone';
import { rupeesToPaise } from '../../utils/money';

const schema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long'),
  whatsappNumber: z
    .string()
    .trim()
    .transform((v) => normalizeWhatsappNumber(v))
    .refine((v) => isE164(v), 'Enter a valid phone (10 digits or +country...)'),
  idType: z.enum(['AADHAAR', 'OTHER']),
  idNumber: z
    .string()
    .trim()
    .min(4, 'ID number is too short')
    .max(30, 'ID number is too long')
    .regex(/^[A-Za-z0-9 \-]+$/, 'Letters, digits, spaces, and dashes only'),
  monthlyRentRupees: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(1, 'Rent must be at least ₹1'),
  roomId: z.string().min(1, 'Select a room'),
  startDate: z.string().min(1, 'Start date is required'),
  initialReading: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0, 'Cannot be negative'),
});
type FormValues = z.infer<typeof schema>;

function todayIsoDate(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function AddRenterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preselectedRoom = params.get('roomId') ?? '';
  const roomsQuery = useRooms();
  const create = useCreateTenant();
  const [photo, setPhoto] = useState<File | null>(null);

  const vacantRooms = (roomsQuery.data ?? []).filter((r) => r.status === 'VACANT');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      whatsappNumber: '',
      idType: 'AADHAAR',
      idNumber: '',
      monthlyRentRupees: undefined as unknown as number,
      roomId: preselectedRoom,
      startDate: todayIsoDate(),
      initialReading: undefined as unknown as number,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await create.mutateAsync({
        name: values.name,
        whatsappNumber: values.whatsappNumber,
        idType: values.idType,
        idNumber: values.idNumber,
        monthlyRentPaise: rupeesToPaise(values.monthlyRentRupees),
        roomId: values.roomId,
        startDate: new Date(values.startDate).toISOString(),
        initialReading: values.initialReading,
        photoFile: photo,
      });
      navigate('/landlord/tenants', { replace: true });
    } catch (err) {
      setError('root', { message: getApiErrorMessage(err) });
    }
  };

  return (
    <AppShell title="Add renter" backTo="/landlord/tenants" bottomNav={<LandlordNav />}>
      <div className="mx-auto w-full max-w-md space-y-4">
        {roomsQuery.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {!roomsQuery.isLoading && vacantRooms.length === 0 && (
          <Card>
            <p className="text-sm text-slate-700">
              You have no vacant rooms. <br />
              Add a room first or move an existing renter out.
            </p>
            <Button className="mt-3" onClick={() => navigate('/landlord/rooms')}>
              Go to rooms
            </Button>
          </Card>
        )}

        {vacantRooms.length > 0 && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Card>
              <h2 className="text-sm font-semibold text-slate-900">Renter</h2>
              <div className="mt-3 space-y-3">
                <Input label="Full name" error={errors.name?.message} {...register('name')} />
                <Input
                  label="WhatsApp number"
                  inputMode="tel"
                  placeholder="+919876543210"
                  helper="10 digits works too — we'll add +91"
                  error={errors.whatsappNumber?.message}
                  {...register('whatsappNumber')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">ID type</label>
                    <select
                      {...register('idType')}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="AADHAAR">Aadhaar</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <Input
                    label="ID number"
                    error={errors.idNumber?.message}
                    {...register('idNumber')}
                  />
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-slate-900">Stay</h2>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Room</label>
                  <select
                    {...register('roomId')}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="">Select a vacant room</option>
                    {vacantRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.roomNumber}
                      </option>
                    ))}
                  </select>
                  {errors.roomId && (
                    <p className="mt-1 text-xs text-red-600">{errors.roomId.message}</p>
                  )}
                </div>
                <Input
                  label="Monthly rent (₹)"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  error={errors.monthlyRentRupees?.message}
                  {...register('monthlyRentRupees', { valueAsNumber: true })}
                />
                <Input
                  label="Start date"
                  type="date"
                  error={errors.startDate?.message}
                  {...register('startDate')}
                />
                <Input
                  label="Initial meter reading"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  helper="Reading on the room's meter today"
                  error={errors.initialReading?.message}
                  {...register('initialReading', { valueAsNumber: true })}
                />
              </div>
            </Card>

            <Card>
              <h2 className="text-sm font-semibold text-slate-900">Photo (optional)</h2>
              <p className="mt-1 text-xs text-slate-500">
                JPG, PNG, or WEBP, max 2 MB. You can add or change it later.
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700"
              />
            </Card>

            {errors.root && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            <Button type="submit" fullWidth loading={isSubmitting}>
              Add renter
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
