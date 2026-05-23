"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { PersonaDefinition } from "@/types/persona.types";
import { CouncilMember } from "@/types/council.types";
import { formatRelativeTime } from "@/lib/utils";
import { Loader2, ArrowLeft, Plus, MessageSquare } from "lucide-react";

interface SessionWithAdvisor {
  id: string;
  title: string | null;
  topic: string | null;
  lastQuestion: string | null;
  questionCount: number;
  created_at: string;
  updated_at: string;
}

interface AdvisorStats {
  sessions: SessionWithAdvisor[];
  memoryCount: number;
  totalQuestions: number;
}

export default function AdvisorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const persona = getPersonaById(id) || getDomainExpertById(id);

  const [stats, setStats] = useState<AdvisorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [roomsRes, analyticsRes] = await Promise.all([
          fetch("/api/council-rooms"),
          fetch("/api/analytics"),
        ]);
        const roomsData = roomsRes.ok ? await roomsRes.json() : null;
        const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;

        const rooms: Array<{
          id: string;
          title: string | null;
          topic: string | null;
          members: CouncilMember[];
          lastQuestion: string | null;
          questionCount: number;
          created_at: string;
          updated_at: string;
        }> = roomsData?.rooms ?? [];

        // Filter to sessions featuring this advisor
        const advisorSessions: SessionWithAdvisor[] = rooms
          .filter((r) =>
            (r.members as unknown as CouncilMember[]).some(
              (m) => m.personaId === id
            )
          )
          .map((r) => ({
            id: r.id,
            title: r.title,
            topic: r.topic,
            lastQuestion: r.lastQuestion,
            questionCount: r.questionCount,
            created_at: r.created_at,
            updated_at: r.updated_at,
          }));

        // Memory count from analytics
        const memoryEntry = (analyticsData?.advisorsKnowingYou ?? []).find(
          (a: { id: string; observations: number }) => a.id === id
        );
        const memoryCount = memoryEntry?.observations ?? 0;
        const totalQuestions = advisorSessions.reduce(
          (sum, s) => sum + (s.questionCount ?? 0),
          0
        );

        setStats({ sessions: advisorSessions, memoryCount, totalQuestions });
      } catch {
        setStats({ sessions: [], memoryCount: 0, totalQuestions: 0 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (!persona) {
    // Redirect to 404 in a client component by using notFound from next/navigation
    // We can just render a not found message
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-sm text-text-secondary">Advisor not found.</p>
        <Link href="/personas" className="text-xs text-accent mt-2 inline-block">
          ← Back to advisors
        </Link>
      </div>
    );
  }

  const hasRelationship = stats && (stats.sessions.length > 0 || stats.memoryCount > 0);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
      {/* Back */}
      <Link
        href="/personas"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowLeft size={12} />
        All advisors
      </Link>

      {/* Advisor header */}
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 border border-surface-border"
          style={{ backgroundColor: `${persona.colorHex}22` }}
        >
          {persona.icon ?? (
            <span className="text-xl font-bold" style={{ color: persona.colorHex }}>
              {persona.name[0]}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-serif italic text-text-primary">{persona.name}</h1>
              <p className="text-sm text-text-muted mt-0.5">{persona.tagline}</p>
            </div>
            <Link
              href={`/council/new?persona=${persona.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-medium text-white transition-colors shrink-0"
            >
              <Plus size={12} />
              Start session
            </Link>
          </div>
        </div>
      </div>

      {/* Relationship signals */}
      {loading ? (
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Loader2 size={14} className="animate-spin" />
          <span>Loading your history...</span>
        </div>
      ) : hasRelationship ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="px-4 py-3 rounded-xl border border-surface-border bg-surface-raised text-center">
            <p className="text-xl font-medium text-text-primary">{stats!.sessions.length}</p>
            <p className="text-[10px] text-text-muted mt-0.5">sessions</p>
          </div>
          <div className="px-4 py-3 rounded-xl border border-surface-border bg-surface-raised text-center">
            <p className="text-xl font-medium text-text-primary">{stats!.totalQuestions}</p>
            <p className="text-[10px] text-text-muted mt-0.5">questions asked</p>
          </div>
          <div className="px-4 py-3 rounded-xl border border-surface-border bg-surface-raised text-center">
            <p className="text-xl font-medium text-text-primary">
              {stats!.memoryCount > 0 ? (
                <span className="text-violet-400">{stats!.memoryCount}</span>
              ) : (
                "—"
              )}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              {stats!.memoryCount >= 3 ? "memories" : "memories"}
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 rounded-xl border border-surface-border bg-surface-raised text-sm text-text-muted">
          You haven&apos;t consulted {persona.name.replace(/^The\s/, "")} yet.{" "}
          <Link href={`/council/new?persona=${persona.id}`} className="text-accent hover:underline">
            Start a session →
          </Link>
        </div>
      )}

      {/* About */}
      <section>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">About</h2>
        <p className="text-sm text-text-secondary leading-relaxed">{persona.description}</p>
        {persona.narrative && (
          <p className="text-sm text-text-muted italic leading-relaxed mt-3">{persona.narrative}</p>
        )}
      </section>

      {/* Known for + Ask about */}
      <div className="grid grid-cols-2 gap-6">
        {persona.knownFor && persona.knownFor.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Known for
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {persona.knownFor.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-surface-overlay border border-surface-border text-text-secondary"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}
        {persona.askAbout && persona.askAbout.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Ask about
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {persona.askAbout.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-accent-muted/30 border border-accent/20 text-accent-muted"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Memory context */}
      {stats && stats.memoryCount >= 3 && (
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            What they know about you
          </h2>
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 shrink-0">
              <span className="w-1 h-1 rounded-full bg-violet-400" />
              Knows you
            </span>
            <p className="text-xs text-text-secondary">
              {persona.name.replace(/^The\s/, "")} has built{" "}
              <span className="text-violet-300">{stats.memoryCount} observations</span> about your
              thinking patterns across your sessions.
            </p>
          </div>
        </section>
      )}

      {/* Session history */}
      {stats && stats.sessions.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
            Sessions together
          </h2>
          <div className="space-y-2">
            {stats.sessions.map((session) => (
              <Link
                key={session.id}
                href={`/council/${session.id}`}
                className="group flex items-start gap-3 px-4 py-3 rounded-xl border border-surface-border bg-surface-raised hover:bg-surface-overlay hover:border-surface-overlay transition-all"
              >
                <MessageSquare size={13} className="text-text-muted mt-0.5 shrink-0 group-hover:text-text-secondary transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-serif italic text-text-primary truncate">
                    {session.title || "Untitled Session"}
                  </p>
                  {session.lastQuestion && (
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      &ldquo;{session.lastQuestion}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-[10px] text-text-muted">
                    {formatRelativeTime(session.updated_at)}
                  </span>
                  {session.questionCount > 0 && (
                    <span className="text-[10px] text-text-muted">
                      {session.questionCount}q
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Domain expert disclaimer */}
      {persona.personaType === "domain_expert" && persona.disclaimerText && (
        <p className="text-[10px] text-text-muted leading-relaxed border-t border-surface-border pt-6">
          {persona.disclaimerText}
        </p>
      )}
    </div>
  );
}
