import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Target,
  Lightbulb,
  PenLine,
  CalendarDays,
  Image as ImageIcon,
  Palette,
  CalendarClock,
  Inbox,
  Compass,
  LineChart,
  MessagesSquare,
  Users,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logo } from "./Logo";

const nav = [
  { to: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { to: "/brand-foundation", label: "Brand Foundation", icon: Target },
  { to: "/ideas", label: "Idea Bank & Moodboards", icon: Lightbulb },
  { to: "/new", label: "Writing Assistant", icon: PenLine },
  { to: "/calendar", label: "Content Calendar", icon: CalendarDays },
  { to: "/media", label: "Media Library", icon: ImageIcon },
  { to: "/brand-kit", label: "Brand Kit", icon: Palette },
  { to: "/calendly", label: "Calendly & Events", icon: CalendarClock },
  { to: "/inbox", label: "Unified Inbox", icon: Inbox },
  { to: "/opportunities", label: "Opportunity Tracker", icon: Compass },
  { to: "/insights", label: "AI Insights", icon: LineChart },
  { to: "/strategy-chat", label: "AI Strategy Chat", icon: MessagesSquare },
  { to: "/organization", label: "Organization & Team", icon: Users },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[260px_1fr]">
      <aside className="bg-white border-r border-slate-200 lg:sticky lg:top-0 lg:h-screen flex flex-col">
        <div className="p-5 border-b border-slate-200">
          <Link to="/dashboard">
            <Logo size={26} />
          </Link>
        </div>
        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-brand/10 text-brand font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={17} strokeWidth={2} className="shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
          <div className="pt-2 mt-2 border-t border-slate-100">
            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                location.pathname.startsWith("/settings")
                  ? "bg-brand/10 text-brand font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <SettingsIcon size={17} strokeWidth={2} className="shrink-0" />
              Settings
            </Link>
          </div>
        </nav>
        <div className="p-3 border-t border-slate-200">
          <button onClick={signOut} className="btn-ghost w-full flex items-center gap-2 justify-start">
            <LogOut size={16} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="p-6 lg:p-10 bg-slate-50 min-h-screen">{children}</main>
    </div>
  );
}
