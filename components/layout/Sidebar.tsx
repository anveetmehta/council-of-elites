"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Users,
  BookOpen,
  Clock,
  Sparkles,
  Plus,
  LogOut,
  X,
  Settings,
} from "lucide-react";

interface SidebarProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  /** Explicit session status — inferred from pathname when omitted */
  sessionStatus?: "live" | "idle" | "completed";
}

/** Derive a wayfinding status from the current pathname */
function useSessionStatus(explicit?: "live" | "idle" | "completed") {
  const pathname = usePathname();
  if (explicit) return explicit;
  // In a council session → show as live; everywhere else → idle
  return pathname.startsWith("/council/") && !pathname.startsWith("/council/new")
    ? ("live" as const)
    : ("idle" as const);
}

const STATUS_CONFIG = {
  live:      { color: "#15803D", label: "Live" },
  idle:      { color: "#8A847A", label: "Idle" },
  completed: { color: "#6D5BE3", label: "Completed" },
} as const;

const NAV_ITEMS = [
  {
    label: "Sessions",
    href: "/history",
    icon: Clock,
  },
  {
    label: "Advisors",
    href: "/personas",
    icon: BookOpen,
  },
  {
    label: "Patterns",
    href: "/analytics",
    icon: Sparkles,
  },
];

export function Sidebar({ user, isOpen, onClose, sessionStatus: explicitStatus }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useSessionStatus(explicitStatus);
  const statusCfg = STATUS_CONFIG[status];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-surface-raised border-r border-surface-border transition-transform duration-200",
        "lg:relative lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Header — CouncilMark + wordmark */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          {/* CouncilMark: 8 dots in a ring, accent center dot */}
          <svg width="22" height="22" viewBox="0 0 48 48" className="shrink-0 text-text-primary" aria-hidden="true">
            <circle cx="24" cy="6"     r="2.8" fill="currentColor" />
            <circle cx="38.8" cy="13"  r="2.8" fill="currentColor" />
            <circle cx="42"   cy="24"  r="2.8" fill="currentColor" />
            <circle cx="38.8" cy="35"  r="2.8" fill="currentColor" />
            <circle cx="24"   cy="42"  r="2.8" fill="currentColor" />
            <circle cx="9.2"  cy="35"  r="2.8" fill="currentColor" />
            <circle cx="6"    cy="24"  r="2.8" fill="currentColor" />
            <circle cx="9.2"  cy="13"  r="2.8" fill="currentColor" />
            <circle cx="24"   cy="24"  r="3.8" fill="#6D5BE3" />
          </svg>
          <span className="text-sm font-serif italic text-text-primary tracking-tight">
            Council of Elites
          </span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Session status indicator — wayfinding (live / idle / completed) */}
      <div className="grid grid-cols-[6px_1fr_auto] items-center gap-2 px-5 py-2.5 border-b border-surface-border">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: statusCfg.color }}
        />
        <span className="text-[11px] text-text-muted">Current session</span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.08em]"
          style={{ color: statusCfg.color }}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* New Council CTA */}
      <div className="px-3 py-3 border-b border-surface-border">
        <Link
          href="/council/new"
          onClick={onClose}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg bg-accent hover:bg-accent-hover transition-colors text-sm font-medium text-white"
        >
          <Plus size={15} />
          New Council
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-surface-overlay text-text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-overlay"
            )}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-surface-border space-y-0.5">
        <Link
          href="/settings"
          onClick={onClose}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/settings"
              ? "bg-surface-overlay text-text-primary"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-overlay"
          )}
        >
          <Settings size={15} />
          Settings
        </Link>

        <div className="flex items-center gap-2.5 px-3 py-2">
          {user.user_metadata?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.user_metadata.avatar_url}
              alt="Avatar"
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-accent-muted border border-accent/30 flex items-center justify-center text-xs text-accent">
              {user.email?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="flex-1 text-xs text-text-secondary truncate">
            {user.user_metadata?.name || user.email}
          </span>
          <button
            onClick={handleSignOut}
            className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
