"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Users,
  BookOpen,
  History,
  BarChart2,
  Plus,
  LogOut,
  X,
  Settings,
} from "lucide-react";

interface SidebarProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  {
    label: "Personas",
    href: "/personas",
    icon: BookOpen,
  },
  {
    label: "History",
    href: "/history",
    icon: History,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart2,
  },
];

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

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
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-accent-muted border border-accent/30 flex items-center justify-center shrink-0">
            <Users size={14} className="text-accent" />
          </div>
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
