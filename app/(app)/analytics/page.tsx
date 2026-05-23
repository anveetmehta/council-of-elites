"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface Advisor {
  id: string;
  name: string;
  tagline: string;
  colorHex: string;
  icon: string | null;
  count?: number;
  observations?: number;
}

interface RecentQuestion {
  user_prompt: string;
  created_at: string;
}

interface TopMemory {
  personaId: string;
  personaName: string;
  content: string;
  importance: number;
  memoryType: string;
}

interface AnalyticsData {
  totalSessions: number;
  totalQuestions: number;
  recentQuestions: RecentQuestion[];
  topAdvisors: Advisor[];
  advisorsKnowingYou: Advisor[];
  topMemories: TopMemory[];
}

export default function PatternsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Could not load your patterns. Please refresh."))
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

  const { totalSessions, totalQuestions, recentQuestions, topAdvisors, advisorsKnowingYou, topMemories } = data;
  const maxCount = topAdvisors[0]?.count ?? 1;
  const hasAnyData = totalSessions > 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif italic text-text-primary mb-1">Patterns</h1>
          <p className="text-sm text-text-secondary">How you think with your council.</p>
        </div>
        {hasAnyData && (
          <div className="flex items-center gap-4 text-xs text-text-muted pt-1">
            <span><span className="text-text-primary font-medium">{totalSessions}</span> sessions</span>
            <span><span className="text-text-primary font-medium">{totalQuestions}</span> questions</span>
          </div>
        )}
      </div>

      {!hasAnyData ? (
        <div className="text-center py-20">
          <Sparkles size={32} className="text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-secondary mb-1">No patterns yet</p>
          <p className="text-xs text-text-muted">Start a few sessions and your thinking patterns will appear here.</p>
        </div>
      ) : (
        <>
          {/* Advisors who know you */}
          {advisorsKnowingYou.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
                Advisors who know you
              </h2>
              <p className="text-xs text-text-muted mb-4 -mt-2">
                These advisors have built context from your past conversations.
              </p>
              <div className="space-y-2">
                {advisorsKnowingYou.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-border bg-surface-raised"
                    style={{ borderLeftWidth: 3, borderLeftColor: a.colorHex }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: `${a.colorHex}22` }}
                    >
                      {a.icon ?? (
                        <span className="text-xs font-bold" style={{ color: a.colorHex }}>
                          {a.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-serif italic text-text-primary truncate">{a.name}</p>
                      <p className="text-[10px] text-text-muted truncate">{a.tagline}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 shrink-0">
                      <span className="w-1 h-1 rounded-full bg-violet-400" />
                      {a.observations} {a.observations === 1 ? "memory" : "memories"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Most consulted advisors */}
          {topAdvisors.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
                Most consulted
              </h2>
              <div className="rounded-xl border border-surface-border bg-surface-raised divide-y divide-surface-border overflow-hidden">
                {topAdvisors.map((a, i) => (
                  <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-xs text-text-muted w-4 shrink-0">{i + 1}</span>
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0"
                      style={{ backgroundColor: `${a.colorHex}22` }}
                    >
                      {a.icon ?? (
                        <span className="font-bold" style={{ color: a.colorHex }}>
                          {a.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="w-36 shrink-0 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{a.name}</p>
                      <p className="text-[10px] text-text-muted truncate">{a.tagline}</p>
                    </div>
                    <div className="flex-1 h-1 bg-surface-overlay rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(((a.count ?? 0) / maxCount) * 100)}%`,
                          backgroundColor: a.colorHex,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted w-16 text-right shrink-0">
                      {a.count} {a.count === 1 ? "session" : "sessions"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* What your advisors see in you — memory narrative */}
          {topMemories && topMemories.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
                What your advisors see in you
              </h2>
              <div className="space-y-2">
                {topMemories.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-4 py-3 rounded-lg bg-surface-raised border border-surface-border"
                  >
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${m.memoryType === "reflection" ? "text-violet-300 bg-violet-500/10" : "text-text-muted"}`}>
                        {m.memoryType === "reflection" ? "insight" : "note"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-muted mb-0.5">{m.personaName}</p>
                      <p className="text-sm text-text-secondary leading-relaxed italic">&ldquo;{m.content}&rdquo;</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent questions */}
          {recentQuestions.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
                Questions you've been sitting with
              </h2>
              <div className="space-y-1">
                {recentQuestions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-surface-raised transition-colors group"
                  >
                    <div className="w-1 h-1 rounded-full bg-text-muted mt-2 shrink-0 group-hover:bg-accent transition-colors" />
                    <p className="flex-1 text-sm text-text-secondary leading-relaxed">{q.user_prompt}</p>
                    <span className="text-[10px] text-text-muted shrink-0 pt-0.5">
                      {formatRelativeTime(q.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
