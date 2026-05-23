"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllArchetypePersonas } from "@/data/personas";
import { getAllDomainExperts } from "@/data/domain-experts";
import { PersonaDefinition } from "@/types/persona.types";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { TierBadge } from "@/components/personas/TierBadge";
import { Loader2 } from "lucide-react";

interface AdvisorRelationship {
  id: string;
  count?: number;
  observations?: number;
}

const ALL_PERSONAS: PersonaDefinition[] = [
  ...getAllArchetypePersonas(),
  ...getAllDomainExperts(),
];

function AdvisorRow({
  persona,
  sessionCount,
  memoryCount,
}: {
  persona: PersonaDefinition;
  sessionCount?: number;
  memoryCount?: number;
}) {
  const hasMemory = (memoryCount ?? 0) >= 3;

  return (
    <Link
      href={`/personas/${persona.id}`}
      className="group flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-border bg-surface-raised hover:bg-surface-overlay hover:border-surface-overlay transition-all"
      style={{ borderLeftWidth: 3, borderLeftColor: persona.colorHex }}
    >
      <PersonaAvatar persona={persona} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {persona.icon && <span className="text-xs">{persona.icon}</span>}
          <span className="text-sm font-serif italic text-text-primary">{persona.name}</span>
          <TierBadge type={persona.personaType} />
          {hasMemory && (
            <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300">
              <span className="w-1 h-1 rounded-full bg-violet-400" />
              Knows you
            </span>
          )}
        </div>
        <p className="text-[10px] text-text-muted truncate">{persona.tagline}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {sessionCount !== undefined && sessionCount > 0 && (
          <span className="text-[10px] text-text-muted">
            {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
          </span>
        )}
        <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
          Open →
        </span>
      </div>
    </Link>
  );
}

function CompactAdvisorCard({ persona }: { persona: PersonaDefinition }) {
  return (
    <Link
      href={`/council/new?persona=${persona.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-border bg-surface-raised hover:bg-surface-overlay hover:border-surface-overlay transition-all group"
    >
      <PersonaAvatar persona={persona} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {persona.icon && <span className="text-xs">{persona.icon}</span>}
          <span className="text-xs font-serif italic text-text-primary truncate">{persona.name}</span>
        </div>
        <p className="text-[10px] text-text-muted truncate">{persona.tagline}</p>
      </div>
    </Link>
  );
}

export default function AdvisorsPage() {
  const [relationships, setRelationships] = useState<{
    topAdvisors: AdvisorRelationship[];
    advisorsKnowingYou: AdvisorRelationship[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setRelationships({
            topAdvisors: d.topAdvisors ?? [],
            advisorsKnowingYou: d.advisorsKnowingYou ?? [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const usedIds = new Set((relationships?.topAdvisors ?? []).map((a) => a.id));
  const sessionMap = Object.fromEntries(
    (relationships?.topAdvisors ?? []).map((a) => [a.id, a.count ?? 0])
  );
  const memoryMap = Object.fromEntries(
    (relationships?.advisorsKnowingYou ?? []).map((a) => [a.id, a.observations ?? 0])
  );

  // Split personas into used and discover
  const usedPersonas = (relationships?.topAdvisors ?? [])
    .map((a) => ALL_PERSONAS.find((p) => p.id === a.id))
    .filter(Boolean) as PersonaDefinition[];

  const archetypes = getAllArchetypePersonas();
  const domainExperts = getAllDomainExperts();
  const unusedArchetypes = archetypes.filter((p) => !usedIds.has(p.id));
  const unusedExperts = domainExperts.filter((p) => !usedIds.has(p.id));

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif italic text-text-primary mb-1">Advisors</h1>
        <p className="text-sm text-text-secondary">
          The minds you consult and the perspectives they bring.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={18} className="animate-spin text-text-muted" />
        </div>
      ) : (
        <>
          {/* Your advisors (used at least once) */}
          {usedPersonas.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
                Your advisors
              </h2>
              <div className="space-y-2">
                {usedPersonas.map((persona) => (
                  <AdvisorRow
                    key={persona.id}
                    persona={persona}
                    sessionCount={sessionMap[persona.id]}
                    memoryCount={memoryMap[persona.id]}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Discover — archetypes */}
          {unusedArchetypes.length > 0 && (
            <section>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {usedPersonas.length > 0 ? "Discover" : "Archetypes"}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unusedArchetypes.map((persona) => (
                  <CompactAdvisorCard key={persona.id} persona={persona} />
                ))}
              </div>
            </section>
          )}

          {/* Domain experts */}
          {unusedExperts.length > 0 && (
            <section>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {usedPersonas.length > 0 ? "More perspectives" : "Domain Expert Perspectives"}
                </h2>
                <span className="text-[10px] text-amber-400/70">AI-inspired</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unusedExperts.map((persona) => (
                  <CompactAdvisorCard key={persona.id} persona={persona} />
                ))}
              </div>
              <p className="mt-5 text-[10px] text-text-muted leading-relaxed">
                Domain expert perspectives are AI-generated based on publicly available writings and interviews. Not affiliated with or endorsed by the individuals named.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
