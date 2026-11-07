import { NavLink } from "react-router-dom";

// Extend this list in later phases as /tenants and /bills become available.
const items = [
  { to: "/landlord", label: "Home", icon: "🏠", end: true },
  { to: "/landlord/rooms", label: "Rooms", icon: "🚪", end: false },
  { to: "/landlord/settings", label: "Settings", icon: "⚙️", end: false },
];

export function LandlordNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
      <ul
        className="flex justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive ? "text-brand-600 font-medium" : "text-slate-500"
                }`
              }
            >
              <span aria-hidden className="text-lg leading-none">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
