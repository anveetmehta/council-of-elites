"use client";

import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  user: User;
}

export function AppShell({ children, user }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <Menu size={18} />
          </button>
          <span className="text-sm font-serif italic text-text-primary">Council of Elites</span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
