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
import { ArrowLeft, Settings2, Loader2 } from "lucide-react";

type Recommendation = { id: string; role: CouncilRole; reason: string };
type BuilderTier = "quick" | "customize" | "advanced";

const MAX_MEMBERS = 4;
const MIN_MEMBERS = 2;

export default function CouncilBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<CouncilMode>("open");
  const [members, setMembers] = useState<CouncilMember[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<BuilderTier>("quick");

  // Recommendation state
  const [topicInput, setTopicInput] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [previewLine, setPreviewLine] = useState<string | null>(null);
  const [recommending, setRecommending] = useState(false);
  const autoTriggered = useRef(false);

  const archetypes = getAllArchetypePersonas();
  const domainExperts = getAllDomainExperts();
  const allPersonas = [...archetypes, ...domainExperts];

  // Pre-populate from URL params
  useEffect(() => {
    const membersParam = searchParams.get("members");
    const personaParam = searchParams.get("persona");
    if (membersParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(membersParam)) as CouncilMember[];
        setMembers(parsed);
        const hasRoles = parsed.some((m) => m.role !== "default");
        if (hasRoles) setMode("structured_debate");
        setTier("quick");
      } catch {}
    } else if (personaParam) {
      setMembers([{ personaId: personaParam, role: "default" }]);
      setTier("customize");
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
    setPreviewLine(null);
    try {
      const res = await fetch("/api/recommend-council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecommendations(data.recommendations);
      setPreviewLine(data.preview ?? null);
      const newMembers: CouncilMember[] = data.recommendations.map((r: Recommendation) => ({
        personaId: r.id,
        role: r.role,
      }));
      setMembers(newMembers);
      const hasRoles = newMembers.some((m) => m.role !== "default");
      if (hasRoles) setMode("structured_debate");
      trackEvent("smart_recommend_used", { topic: topic.trim() });
    } catch {
      setRecommendations(null);
    } finally {
      setRecommending(false);
    }
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

      const initialTopic = searchParams.get("topic");
      const url = initialTopic
        ? `/council/${data.id}?q=${encodeURIComponent(initialTopic)}`
        : `/council/${data.id}`;
      router.push(url);
    } catch (err) {
      setError("Failed to create council. Please try again.");
      setCreating(false);
    }
  }

  const canStart = members.length >= MIN_MEMBERS && members.length <= MAX_MEMBERS;
  const hasTopic = !!searchParams.get("topic");
  const topic = searchParams.get("topic");

  // ── Tier 1: Quick Start ──
  if (tier === "quick" && (recommending || recommendations || members.length > 0 || !hasTopic === false)) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft size={12} />
          Back
        </button>

        {topic && (
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
              You asked
            </p>
            <p className="text-base text-text-primary italic border-l-2 border-accent/40 pl-3 leading-relaxed">
              "{topic}"
            </p>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-serif italic text-text-primary mb-2 leading-tight">
            {recommending ? "Picking your council..." : "Your suggested council"}
          </h1>
          {!recommending && previewLine && (
            <p className="text-sm text-text-secondary leading-relaxed">
              {previewLine}
            </p>
          )}
        </div>

        {recommending && (
          <div className="space-y-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-surface-raised border border-surface-border animate-pulse"
              />
            ))}
          </div>
        )}

        {!recommending && recommendations && recommendations.length > 0 && (
          <div className="space-y-2.5 mb-8">
            {recommendations.map((rec) => {
              const persona = allPersonas.find((p) => p.id === rec.id);
              if (!persona) return null;
              const { label, className: roleClass } = getRoleBadgeConfig(rec.role);
              return (
                <div
                  key={rec.id}
                  className="flex items-start gap-3 p-4 rounded-xl border bg-surface-raised border-surface-border"
                  style={{ borderLeftWidth: "3px", borderLeftColor: persona.colorHex }}
                >
                  <PersonaAvatar persona={persona} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-serif italic font-semibold text-text-primary">
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
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {rec.reason}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!recommending && !recommendations && members.length > 0 && (
          <div className="space-y-2.5 mb-8">
            {members.map((m) => {
              const persona = allPersonas.find((p) => p.id === m.personaId);
              if (!persona) return null;
              const { label, className: roleClass } = getRoleBadgeConfig(m.role);
              return (
                <div
                  key={m.personaId}
                  className="flex items-start gap-3 p-4 rounded-xl border bg-surface-raised border-surface-border"
                  style={{ borderLeftWidth: "3px", borderLeftColor: persona.colorHex }}
                >
                  <PersonaAvatar persona={persona} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-serif italic font-semibold text-text-primary">
                        {persona.name}
                      </span>
                      {m.role !== "default" && (
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
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {persona.tagline}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!recommending && members.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={handleStartCouncil}
              disabled={!canStart || creating}
              className="w-full py-3 px-5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium text-white inline-flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Setting up...
                </>
              ) : (
                <>Start this conversation</>
              )}
            </button>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setTier("customize")}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Swap someone out
              </button>
              <span className="text-text-muted">·</span>
              <button
                onClick={() => setTier("advanced")}
                className="text-xs text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1"
              >
                <Settings2 size={11} />
                Advanced setup
              </button>
            </div>
          </div>
        )}

        {!hasTopic && !recommending && members.length === 0 && (
          <NoTopicEntry
            topicInput={topicInput}
            setTopicInput={setTopicInput}
            onSubmit={() => fetchRecommendations(topicInput)}
            onAdvanced={() => setTier("advanced")}
          />
        )}

        {error && (
          <p className="mt-4 text-xs text-red-400 text-center">{error}</p>
        )}
      </div>
    );
  }

  // ── Tier 2: Customize ──
  if (tier === "customize") {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 pb-32">
        <button
          onClick={() => setTier("quick")}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors mb-6"
        >
          <ArrowLeft size={12} />
          Back to suggestion
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-serif italic text-text-primary mb-2">
            Customize your council
          </h1>
          <p className="text-sm text-text-secondary">
            Tap to add or remove. Up to {MAX_MEMBERS} advisors.
          </p>
        </div>

        {members.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
              Selected ({members.length}/{MAX_MEMBERS})
            </h2>
            <div className="space-y-2">
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
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
            Available advisors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allPersonas.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePersona(p)}
                disabled={!isSelected(p.id) && members.length >= MAX_MEMBERS}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed",
                  isSelected(p.id)
                    ? "bg-accent-muted/20 border-accent/40"
                    : "bg-surface-raised border-surface-border hover:border-surface-overlay"
                )}
              >
                <PersonaAvatar persona={p} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-serif italic font-semibold text-text-primary truncate">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-text-muted truncate">
                    {p.tagline}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-surface border-t border-surface-border px-6 py-3">
          <div className="max-w-3xl mx-auto space-y-2">
            <button
              onClick={handleStartCouncil}
              disabled={!canStart || creating}
              className="w-full py-3 px-5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium text-white"
            >
              {creating ? "Setting up..." : `Start with ${members.length} advisor${members.length !== 1 ? "s" : ""}`}
            </button>
            <button
              onClick={() => setTier("advanced")}
              className="block mx-auto text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Advanced: roles & customization →
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400 text-center">{error}</p>
        )}
      </div>
    );
  }

  // ── Tier 3: Advanced (full builder) ──
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <button
        onClick={() => setTier(members.length > 0 ? "customize" : "quick")}
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors mb-4"
      >
        <ArrowLeft size={12} />
        Back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-serif italic text-text-primary mb-2">
          Advanced council setup
        </h1>
        <p className="text-text-secondary text-sm">
          Pick 2–4 advisors. Assign roles. Add focus areas if you want.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3 flex-wrap">
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
                  Select at least 2 advisors
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

function NoTopicEntry({
  topicInput,
  setTopicInput,
  onSubmit,
  onAdvanced,
}: {
  topicInput: string;
  setTopicInput: (v: string) => void;
  onSubmit: () => void;
  onAdvanced: () => void;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-6">
      <h2 className="text-base font-serif italic text-text-primary mb-2">
        What are you wrestling with?
      </h2>
      <p className="text-sm text-text-secondary mb-4">
        Tell us what's on your mind and we'll suggest the right panel.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="text"
          value={topicInput}
          onChange={(e) => setTopicInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="e.g. Should I raise funding or bootstrap?"
          autoFocus
          className="flex-1 px-3 py-2.5 rounded-lg text-sm bg-surface border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
        />
        <button
          onClick={onSubmit}
          disabled={!topicInput.trim()}
          className="px-4 py-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 transition-colors text-sm font-medium text-white whitespace-nowrap"
        >
          Suggest a panel
        </button>
      </div>
      <button
        onClick={onAdvanced}
        className="text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        Or pick advisors manually →
      </button>
    </div>
  );
}
