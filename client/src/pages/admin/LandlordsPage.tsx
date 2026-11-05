import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Spinner,
} from "../../components/ui";
import { AppShell } from "../../components/layout/AppShell";
import { getApiErrorMessage } from "../../api/client";
import {
  useCreateLandlord,
  useDeleteLandlord,
  useLandlords,
  useUpdateLandlord,
} from "../../hooks/useLandlords";
import type { LandlordSummary } from "../../types/landlord";

// ── forms ────────────────────────────────────────────────────────

const phoneRegex = /^\+[1-9]\d{9,14}$/;

const createSchema = z.object({
  name: z.string().trim().min(2, "Name is too short"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().regex(phoneRegex, "Format: +919876543210"),
  password: z.string().min(8, "At least 8 characters"),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().trim().min(2, "Name is too short"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().regex(phoneRegex, "Format: +919876543210"),
});
type EditForm = z.infer<typeof editSchema>;

// ── page ─────────────────────────────────────────────────────────

export default function LandlordsPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<LandlordSummary | null>(null);
  const [deleting, setDeleting] = useState<LandlordSummary | null>(null);

  const landlordsQuery = useLandlords(search || undefined);

  return (
    <AppShell title="Landlords">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search name, email, or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <Button onClick={() => setCreateOpen(true)}>New</Button>
        </div>

        {landlordsQuery.isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {landlordsQuery.isError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {getApiErrorMessage(landlordsQuery.error)}
          </div>
        )}

        {landlordsQuery.data && landlordsQuery.data.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600">
              {search
                ? "No landlords match your search."
                : "No landlords yet. Create the first one."}
            </p>
          </Card>
        )}

        <div className="space-y-3">
          {landlordsQuery.data?.map((landlord) => (
            <LandlordRow
              key={landlord.id}
              landlord={landlord}
              onEdit={() => setEditing(landlord)}
              onDelete={() => setDeleting(landlord)}
            />
          ))}
        </div>
      </div>

      <CreateLandlordModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <EditLandlordModal landlord={editing} onClose={() => setEditing(null)} />

      <DeleteLandlordModal
        landlord={deleting}
        onClose={() => setDeleting(null)}
      />
    </AppShell>
  );
}

// ── row ──────────────────────────────────────────────────────────

function LandlordRow({
  landlord,
  onEdit,
  onDelete,
}: {
  landlord: LandlordSummary;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const update = useUpdateLandlord();
  const isActive = landlord.status === "ACTIVE";

  const toggleStatus = () =>
    update.mutate({
      id: landlord.id,
      input: { status: isActive ? "SUSPENDED" : "ACTIVE" },
    });

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900">
              {landlord.name}
            </h3>
            <Badge tone={isActive ? "green" : "red"}>{landlord.status}</Badge>
          </div>
          <p className="mt-1 truncate text-sm text-slate-600">
            {landlord.email}
          </p>
          <p className="truncate text-xs text-slate-500">{landlord.phone}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button
          variant={isActive ? "danger" : "secondary"}
          size="sm"
          loading={update.isPending}
          onClick={toggleStatus}
        >
          {isActive ? "Suspend" : "Activate"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-600"
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}

// ── create modal ─────────────────────────────────────────────────

function CreateLandlordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateLandlord();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const close = () => {
    reset();
    create.reset();
    onClose();
  };

  const onSubmit = async (values: CreateForm) => {
    try {
      await create.mutateAsync(values);
      close();
    } catch (err) {
      setError("root", { message: getApiErrorMessage(err) });
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New landlord"
      footer={
        <>
          <Button variant="ghost" onClick={close} type="button">
            Cancel
          </Button>
          <Button
            form="create-landlord-form"
            type="submit"
            loading={isSubmitting}
          >
            Create
          </Button>
        </>
      }
    >
      <form
        id="create-landlord-form"
        className="space-y-3"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Input
          label="Name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="off"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Phone"
          inputMode="tel"
          placeholder="+919876543210"
          error={errors.phone?.message}
          helper="Use international format"
          {...register("phone")}
        />
        <Input
          label="Temporary password"
          type="text"
          error={errors.password?.message}
          helper="Share with the landlord; they can change it after login."
          {...register("password")}
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

// ── edit modal ───────────────────────────────────────────────────

function EditLandlordModal({
  landlord,
  onClose,
}: {
  landlord: LandlordSummary | null;
  onClose: () => void;
}) {
  const update = useUpdateLandlord();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: landlord
      ? { name: landlord.name, email: landlord.email, phone: landlord.phone }
      : undefined,
  });

  const close = () => {
    reset();
    update.reset();
    onClose();
  };

  const onSubmit = async (values: EditForm) => {
    if (!landlord) return;
    try {
      await update.mutateAsync({ id: landlord.id, input: values });
      close();
    } catch (err) {
      setError("root", { message: getApiErrorMessage(err) });
    }
  };

  return (
    <Modal
      open={!!landlord}
      onClose={close}
      title="Edit landlord"
      footer={
        <>
          <Button variant="ghost" onClick={close} type="button">
            Cancel
          </Button>
          <Button
            form="edit-landlord-form"
            type="submit"
            loading={isSubmitting}
          >
            Save
          </Button>
        </>
      }
    >
      <form
        id="edit-landlord-form"
        className="space-y-3"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Input
          label="Name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Phone"
          inputMode="tel"
          error={errors.phone?.message}
          {...register("phone")}
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

// ── delete modal ─────────────────────────────────────────────────

function DeleteLandlordModal({
  landlord,
  onClose,
}: {
  landlord: LandlordSummary | null;
  onClose: () => void;
}) {
  const del = useDeleteLandlord();
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    del.reset();
    onClose();
  };

  const confirm = async () => {
    if (!landlord) return;
    try {
      await del.mutateAsync(landlord.id);
      close();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Modal
      open={!!landlord}
      onClose={close}
      title="Delete landlord?"
      footer={
        <>
          <Button variant="ghost" onClick={close} type="button">
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={del.isPending}>
            Delete permanently
          </Button>
        </>
      }
    >
      {landlord && (
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            You are about to delete <strong>{landlord.name}</strong> (
            {landlord.email}).
          </p>
          <p className="text-red-700">
            This will permanently remove all their rooms, tenants, occupancies,
            meter readings, bills, and payments. This action cannot be undone.
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
