"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAllArchetypePersonas } from "@/data/personas";
import { getAllDomainExperts } from "@/data/domain-experts";
import { PersonaDefinition } from "@/types/persona.types";
import { CouncilMember, CouncilMode, CouncilRole, MemberAttributes } from "@/types/council.types";
import { PersonaCard } from "@/components/personas/PersonaCard";
import { MemberCard } from "@/components/council/MemberCard";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { createClient } from "@/lib/supabase/client";
import { trackEvent, Events } from "@/lib/analytics";
import { cn, getRoleBadgeConfig } from "@/lib/utils";

type Recommendation = { id: string; role: CouncilRole; reason: string };

const MAX_MEMBERS = 4;
const MIN_MEMBERS = 2;

export default function CouncilBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<CouncilMode>("open");
  const [members, setMembers] = useState<CouncilMember[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Smart recommendation state
  const [topicInput, setTopicInput] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [recommending, setRecommending] = useState(false);
  const autoTriggered = useRef(false);

  const archetypes = getAllArchetypePersonas();
  const domainExperts = getAllDomainExperts();
  const allPersonas = [...archetypes, ...domainExperts];

  // Pre-populate from recommended council or URL param
  useEffect(() => {
    const membersParam = searchParams.get("members");
    const personaParam = searchParams.get("persona");
    if (membersParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(membersParam)) as CouncilMember[];
        setMembers(parsed);
        const hasRoles = parsed.some((m) => m.role !== "default");
        if (hasRoles) setMode("structured_debate");
      } catch {}
    } else if (personaParam) {
      setMembers([{ personaId: personaParam, role: "default" }]);
    }
  }, [searchParams]);

  // Auto-trigger recommendations from topic URL param
  useEffect(() => {
    const topicParam = searchParams.get("topic");
    const membersParam = searchParams.get("members");
    const personaParam = searchParams.get("persona");
    if (topicParam && !membersParam && !personaParam && !autoTriggered.current) {
      autoTriggered.current = true;
      setTopicInput(topicParam);
      fetchRecommendations(topicParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRecommendations(topic: string) {
    if (!topic.trim()) return;
    setRecommending(true);
    try {
      const res = await fetch("/api/recommend-council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecommendations(data.recommendations);
      trackEvent("smart_recommend_used", { topic: topic.trim() });
    } catch {
      setRecommendations(null);
    } finally {
      setRecommending(false);
    }
  }

  function applyRecommendations() {
    if (!recommendations) return;
    const newMembers: CouncilMember[] = recommendations.map((r) => ({
      personaId: r.id,
      role: r.role,
    }));
    setMembers(newMembers);
    const hasRoles = newMembers.some((m) => m.role !== "default");
    if (hasRoles) setMode("structured_debate");
    setRecommendations(null);
    trackEvent("smart_recommend_applied", { topic: topicInput, count: newMembers.length });
  }

  function isSelected(personaId: string) {
    return members.some((m) => m.personaId === personaId);
  }

  function togglePersona(persona: PersonaDefinition) {
    if (isSelected(persona.id)) {
      setMembers((prev) => prev.filter((m) => m.personaId !== persona.id));
    } else if (members.length < MAX_MEMBERS) {
      setMembers((prev) => [...prev, { personaId: persona.id, role: "default" }]);
    }
  }

  function updateMemberRole(personaId: string, role: CouncilRole) {
    setMembers((prev) =>
      prev.map((m) => (m.personaId === personaId ? { ...m, role } : m))
    );
    trackEvent(Events.ROLE_ASSIGNED, { role, personaId });
  }

  function updateMemberAttributes(personaId: string, attrs: MemberAttributes) {
    setMembers((prev) =>
      prev.map((m) =>
        m.personaId === personaId ? { ...m, attributes: attrs } : m
      )
    );
  }

  function removeMember(personaId: string) {
    setMembers((prev) => prev.filter((m) => m.personaId !== personaId));
  }

  function applyStructuredDebate() {
    setMode("structured_debate");
    setMembers((prev) =>
      prev.map((m, i) => ({
        ...m,
        role: (["advocate", "critic", "moderator", "default"] as CouncilRole[])[i] ?? "default",
      }))
    );
  }

  function applyOpenMode() {
    setMode("open");
    setMembers((prev) => prev.map((m) => ({ ...m, role: "default" })));
  }

  async function handleStartCouncil() {
    if (members.length < MIN_MEMBERS) return;
    setCreating(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const hasDomainExperts = members.some((m) =>
        getAllDomainExperts().some((e) => e.id === m.personaId)
      );

      const { data, error: err } = await supabase
        .from("council_rooms")
        .insert({
          user_id: user.id,
          members: members,
          mode,
          topic: searchParams.get("topic") || null,
        })
        .select("id")
        .single();

      if (err) throw err;

      trackEvent(Events.COUNCIL_CREATED, {
        memberCount: members.length,
        mode,
        hasCustomRoles: members.some((m) => m.role !== "default"),
        usedRecommended: !!searchParams.get("recommended"),
        hasDomainExperts,
      });

      if (hasDomainExperts) {
        trackEvent(Events.DOMAIN_EXPERT_USED, {
          personaIds: members
            .filter((m) => getAllDomainExperts().some((e) => e.id === m.personaId))
            .map((m) => m.personaId),
        });
      }

      router.push(`/council/${data.id}`);
    } catch (err) {
      setError("Failed to create council. Please try again.");
      setCreating(false);
    }
  }

  const canStart = members.length >= MIN_MEMBERS && members.length <= MAX_MEMBERS;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Build your council
        </h1>
        <p className="text-text-secondary text-sm">
          Select 2–4 advisors. Optionally assign roles to structure the discussion.
        </p>
      </div>

      {/* Smart Recommendation Section */}
      {members.length === 0 && !searchParams.get("recommended") && !recommendations && (
        <div className="mb-8 p-5 rounded-xl border border-surface-border bg-surface-raised">
          <p className="text-sm font-medium text-text-primary mb-3">
            What do you need help with?
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchRecommendations(topicInput)}
              placeholder="e.g. Should I raise funding or bootstrap my startup?"
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-surface border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
            />
            <button
              onClick={() => fetchRecommendations(topicInput)}
              disabled={!topicInput.trim() || recommending}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 transition-colors text-sm font-medium text-white whitespace-nowrap"
            >
              {recommending ? "Thinking..." : "Suggest advisors"}
            </button>
          </div>
          <p className="text-[11px] text-text-muted mt-2">
            Or skip this and pick advisors manually below
          </p>
        </div>
      )}

      {/* Recommending Skeleton */}
      {recommending && !recommendations && (
        <div className="mb-8 p-5 rounded-xl border border-surface-border bg-surface-raised">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-accent animate-pulse" />
            <p className="text-sm text-text-secondary">Finding the best advisors for your topic...</p>
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-surface-overlay animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Recommendation Results */}
      {recommendations && recommendations.length > 0 && (
        <div className="mb-8 p-5 rounded-xl border border-accent/30 bg-surface-raised">
          <p className="text-sm font-medium text-text-primary mb-3">
            Suggested council for your topic
          </p>
          <div className="space-y-2 mb-4">
            {recommendations.map((rec) => {
              const persona = allPersonas.find((p) => p.id === rec.id);
              if (!persona) return null;
              const { label, className: roleClass } = getRoleBadgeConfig(rec.role);
              return (
                <div
                  key={rec.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-surface border border-surface-border"
                >
                  <PersonaAvatar persona={persona} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-text-primary">
                        {persona.name}
                      </span>
                      {rec.role !== "default" && (
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                            roleClass
                          )}
                        >
                          {label}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      {rec.reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyRecommendations}
              className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover transition-colors text-sm font-medium text-white"
            >
              Use this council
            </button>
            <button
              onClick={() => setRecommendations(null)}
              className="px-4 py-2 rounded-lg border border-surface-border text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Pick manually instead
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Persona selection */}
        <div className="lg:col-span-2 space-y-8">
          {/* Mode toggle */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">Discussion mode:</span>
            <div className="flex rounded-lg border border-surface-border overflow-hidden">
              <button
                onClick={applyOpenMode}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "open"
                    ? "bg-surface-overlay text-text-primary"
                    : "bg-surface-raised text-text-secondary hover:text-text-primary"
                }`}
              >
                Open Discussion
              </button>
              <button
                onClick={applyStructuredDebate}
                disabled={members.length < 2}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-surface-border disabled:opacity-40 disabled:cursor-not-allowed ${
                  mode === "structured_debate"
                    ? "bg-surface-overlay text-text-primary"
                    : "bg-surface-raised text-text-secondary hover:text-text-primary"
                }`}
              >
                Structured Debate
              </button>
            </div>
            {mode === "structured_debate" && (
              <span className="text-[10px] text-text-muted">
                Auto-assigns For / Against / Moderator
              </span>
            )}
          </div>

          {/* Archetypes */}
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
              Archetypes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {archetypes.map((p) => (
                <PersonaCard
                  key={p.id}
                  persona={p}
                  selectable
                  selected={isSelected(p.id)}
                  onSelect={togglePersona}
                />
              ))}
            </div>
          </section>

          {/* Domain Experts */}
          <section>
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
              Domain Expert Perspectives
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {domainExperts.map((p) => (
                <PersonaCard
                  key={p.id}
                  persona={p}
                  selectable
                  selected={isSelected(p.id)}
                  onSelect={togglePersona}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right: Selected members */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
                Your Council
              </h2>
              <span className="text-xs text-text-muted">
                {members.length}/{MAX_MEMBERS}
              </span>
            </div>

            {members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-surface-border p-8 text-center">
                <p className="text-xs text-text-muted">
                  Select at least 2 advisors to start
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const persona = allPersonas.find((p) => p.id === member.personaId);
                  if (!persona) return null;
                  return (
                    <MemberCard
                      key={member.personaId}
                      persona={persona}
                      member={member}
                      onRoleChange={(role) => updateMemberRole(member.personaId, role)}
                      onAttributeChange={(attrs) => updateMemberAttributes(member.personaId, attrs)}
                      onRemove={() => removeMember(member.personaId)}
                    />
                  );
                })}
              </div>
            )}

            {members.length > 0 && members.length < MIN_MEMBERS && (
              <p className="mt-3 text-xs text-text-muted">
                Add {MIN_MEMBERS - members.length} more advisor{MIN_MEMBERS - members.length > 1 ? "s" : ""} to start
              </p>
            )}

            {error && (
              <p className="mt-3 text-xs text-red-400">{error}</p>
            )}

            <button
              onClick={handleStartCouncil}
              disabled={!canStart || creating}
              className="mt-5 w-full py-2.5 px-4 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium text-white"
            >
              {creating ? "Creating..." : `Start Council (${members.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
