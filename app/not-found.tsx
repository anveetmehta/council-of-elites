import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-accent-muted border border-accent/30 flex items-center justify-center mb-6">
        <Users size={22} className="text-accent" />
      </div>

      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
        404
      </p>
      <h1 className="text-2xl font-semibold text-text-primary mb-3">
        Council not found
      </h1>
      <p className="text-sm text-text-secondary max-w-xs leading-relaxed mb-8">
        This page doesn&apos;t exist or you don&apos;t have access to it.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        Back to home
      </Link>
    </div>
  );
}
