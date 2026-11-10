import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface AppShellProps {
  title: string;
  /** When set, shows a ← back button in the header. */
  backTo?: string;
  rightSlot?: ReactNode;
  bottomNav?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  title,
  backTo,
  rightSlot,
  bottomNav,
  children,
}: AppShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {backTo && (
              <button
                onClick={() => navigate(backTo)}
                aria-label="Back"
                className="-ml-1 rounded-md p-1 text-slate-600 hover:bg-slate-100"
              >
                ←
              </button>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-slate-900">
                {title}
              </h1>
              {user && (
                <p className="truncate text-xs text-slate-500">
                  {user.name} · {user.email}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rightSlot}
            <button
              onClick={handleLogout}
              className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className={`flex-1 px-4 py-4 ${bottomNav ? "pb-24" : ""}`}>
        {children}
      </main>
      {bottomNav}
    </div>
  );
}
