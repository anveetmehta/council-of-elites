"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, LayoutGrid, MessageSquare, ThumbsUp, BarChart2 } from "lucide-react";

interface TopPersona {
  id: string;
  name: string;
  colorHex: string;
  count: number;
}

interface AnalyticsData {
  platform: {
    totalUsers: number;
    totalCouncils: number;
    totalQuestions: number;
  } | null;
  personal: {
    councils: number;
    questions: number;
    feedback: number;
    avgQuestionsPerCouncil: number;
    topPersonas: TopPersona[];
    roleBreakdown: Record<string, number>;
  };
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 rounded-xl border border-surface-border bg-surface-raised">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</span>
        <Icon size={15} className="text-text-muted" />
      </div>
      <div>
        <p className="text-3xl font-semibold text-text-primary">{value}</p>
        {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  advocate: "Advocate",
  critic: "Critic",
  moderator: "Moderator",
  questioner: "Questioner",
  default: "Open",
};

const ROLE_COLORS: Record<string, string> = {
  advocate: "#22c55e",
  critic: "#ef4444",
  moderator: "#a855f7",
  questioner: "#3b82f6",
  default: "#6B7280",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Could not load analytics. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-red-400 mb-2">{error ?? "Unknown error"}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-text-muted hover:text-text-secondary underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const { platform, personal } = data;
  const maxPersonaCount = personal.topPersonas[0]?.count ?? 1;
  const totalRoles = Object.values(personal.roleBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-1">Analytics</h1>
        <p className="text-sm text-text-secondary">Usage overview and activity breakdown.</p>
      </div>

      {/* Platform Overview */}
      {platform && (
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
            Platform Overview
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total Users" value={platform.totalUsers} icon={Users} />
            <StatCard label="Total Councils" value={platform.totalCouncils} icon={LayoutGrid} />
            <StatCard label="Total Questions" value={platform.totalQuestions} icon={MessageSquare} />
          </div>
        </section>
      )}

      {/* Your Activity */}
      <section>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
          Your Activity
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Councils" value={personal.councils} icon={LayoutGrid} />
          <StatCard label="Questions" value={personal.questions} icon={MessageSquare} />
          <StatCard label="Feedback" value={personal.feedback} icon={ThumbsUp} />
          <StatCard
            label="Avg / Council"
            value={personal.avgQuestionsPerCouncil}
            icon={BarChart2}
            sub="questions per council"
          />
        </div>
      </section>

      {/* Top Personas */}
      {personal.topPersonas.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
            Your Top Personas
          </h2>
          <div className="rounded-xl border border-surface-border bg-surface-raised divide-y divide-surface-border overflow-hidden">
            {personal.topPersonas.map((p) => (
              <div key={p.id} className="px-5 py-3.5 flex items-center gap-4">
                {/* Color dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.colorHex }}
                />
                {/* Name */}
                <span className="text-sm text-text-primary w-48 truncate">{p.name}</span>
                {/* Bar */}
                <div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round((p.count / maxPersonaCount) * 100)}%`,
                      backgroundColor: p.colorHex,
                    }}
                  />
                </div>
                {/* Count */}
                <span className="text-xs text-text-muted w-16 text-right shrink-0">
                  {p.count} {p.count === 1 ? "council" : "councils"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Role Breakdown */}
      {totalRoles > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
            Role Usage
          </h2>
          <div className="rounded-xl border border-surface-border bg-surface-raised divide-y divide-surface-border overflow-hidden">
            {Object.entries(personal.roleBreakdown)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([role, count]) => (
                <div key={role} className="px-5 py-3.5 flex items-center gap-4">
                  {/* Color dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: ROLE_COLORS[role] ?? "#6B7280" }}
                  />
                  {/* Role name */}
                  <span className="text-sm text-text-primary w-32">
                    {ROLE_LABELS[role] ?? role}
                  </span>
                  {/* Bar */}
                  <div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((count / totalRoles) * 100)}%`,
                        backgroundColor: ROLE_COLORS[role] ?? "#6B7280",
                      }}
                    />
                  </div>
                  {/* Count + % */}
                  <span className="text-xs text-text-muted w-20 text-right shrink-0">
                    {count} · {Math.round((count / totalRoles) * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
