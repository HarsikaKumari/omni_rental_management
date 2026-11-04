import { useAuth } from "../../hooks/useAuth";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  return (
    <main className="min-h-dvh p-6">
      <h1 className="text-xl font-semibold">Admin dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">Signed in as {user?.email}</p>
      <p className="mt-1 text-xs text-slate-500">
        Full admin UI lands in Phase 3.
      </p>
      <button
        onClick={() => logout()}
        className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
      >
        Log out
      </button>
    </main>
  );
}
