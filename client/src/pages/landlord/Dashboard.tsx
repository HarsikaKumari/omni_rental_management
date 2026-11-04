import { useAuth } from "../../hooks/useAuth";

export default function LandlordDashboard() {
  const { user, logout } = useAuth();
  return (
    <main className="min-h-dvh p-6">
      <h1 className="text-xl font-semibold">Landlord dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">Signed in as {user?.email}</p>
      <p className="mt-1 text-xs text-slate-500">
        Full landlord UI lands in Phase 4+.
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
