import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { User, Mail, LogOut } from "lucide-react";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-text-primary mb-8">Settings</h1>

      {/* Account info */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Account
        </h2>
        <div className="rounded-xl border border-surface-border bg-surface-raised divide-y divide-surface-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-accent-muted border border-accent/30 flex items-center justify-center">
              {user.user_metadata?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <User size={14} className="text-accent" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {user.user_metadata?.name || "Your name"}
              </p>
              <p className="text-xs text-text-muted">Signed in with Google</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <Mail size={14} className="text-text-muted" />
            <p className="text-sm text-text-secondary">{user.email}</p>
          </div>
        </div>
      </section>

      {/* Legal */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Legal
        </h2>
        <div className="rounded-xl border border-surface-border bg-surface-raised divide-y divide-surface-border">
          <Link
            href="/terms"
            className="flex items-center justify-between px-4 py-3 hover:bg-surface-overlay transition-colors group"
          >
            <span className="text-sm text-text-secondary group-hover:text-text-primary">Terms of Service</span>
            <span className="text-text-muted text-xs">→</span>
          </Link>
          <div className="px-4 py-3">
            <p className="text-xs text-text-muted leading-relaxed">
              AI-Inspired Perspective personas are generated from publicly available materials only. Not affiliated with or endorsed by any named individuals. For educational purposes only.
            </p>
          </div>
        </div>
      </section>

      {/* Sign out */}
      <section>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
          Account actions
        </h2>
        <div className="rounded-xl border border-surface-border bg-surface-raised">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-400 hover:bg-surface-overlay transition-colors rounded-xl"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
