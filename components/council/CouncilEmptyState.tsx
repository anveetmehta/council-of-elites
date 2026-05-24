"use client";

import { useEffect, useState } from "react";
import { CouncilMember } from "@/types/council.types";
import { PersonaDefinition } from "@/types/persona.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { Loader2, Sparkles } from "lucide-react";

interface CouncilEmptyStateProps {
  members: CouncilMember[];
  topic?: string | null;
  onQuestionClick: (question: string) => void;
}

function getPersona(id: string): PersonaDefinition | undefined {
  return getPersonaById(id) || getDomainExpertById(id);
}

/**
 * The empty state when a user lands on a new council before asking anything.
 *
 * Instead of "Your council is assembled. Ask them a question below.",
 * we show:
 *  - Who's in the room, with personality
 *  - 4 AI-generated questions this specific lineup is well-suited for
 *  - A clear, warm entry point into the conversation
 */
export function CouncilEmptyState({ members, topic, onQuestionClick }: CouncilEmptyStateProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  const nonModeratorMembers = members.filter((m) => m.role !== "moderator");

  useEffect(() => {
    fetch("/api/suggested-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ members, topic }),
    })
      .then((r) => (r.ok ? r.json() : { questions: [] }))
      .then((d) => setQuestions(d.questions ?? []))
      .catch(() => setQuestions([]))
      .finally(() => setLoadingQuestions(false));
  }, [members, topic]);

  return (
    <div className="max-w-3xl mx-auto py-10 px-2 animate-fade-up">
      {/* Heading */}
      <div className="text-center mb-10">
        <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted mb-3">
          Your council is assembled
        </p>
        <h1 className="text-3xl font-serif italic text-text-primary mb-2">
          {nonModeratorMembers.length === 1
            ? "Ready when you are."
            : `${nonModeratorMembers.length} minds. One question.`}
        </h1>
        <p className="text-sm text-text-secondary max-w-md mx-auto">
          {topic
            ? `They're here to think about ${topic.toLowerCase()} with you.`
            : "Ask them what you're actually wrestling with — they're built for the hard questions."}
        </p>
      </div>

      {/* Who's in the room */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {nonModeratorMembers.map((m) => {
          const persona = getPersona(m.personaId);
          if (!persona) return null;
          return (
            <div
              key={m.personaId}
              className="flex items-start gap-3 p-4 rounded-xl bg-surface-raised border border-surface-border"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: persona.colorHex,
              }}
            >
              <PersonaAvatar persona={persona} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {persona.icon && <span className="text-sm">{persona.icon}</span>}
                  <h3 className="text-sm font-serif italic text-text-primary truncate">
                    {persona.name}
                  </h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed mb-2">
                  {persona.tagline}
                </p>
                {persona.askAbout && persona.askAbout.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {persona.askAbout.slice(0, 2).map((topic) => (
                      <span
                        key={topic}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-surface-overlay text-text-muted"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested questions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={13} className="text-accent" />
          <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
            Try asking
          </p>
        </div>
        {loadingQuestions ? (
          <div className="flex items-center justify-center py-8 text-text-muted text-sm">
            <Loader2 size={14} className="animate-spin mr-2" />
            <span className="text-xs">Tailoring questions to your council…</span>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-text-muted">
              Just type your real question below — these advisors do best with
              specifics.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => onQuestionClick(q)}
                className="group w-full text-left p-3.5 rounded-xl bg-surface-raised border border-surface-border
                           hover:border-accent/40 hover:bg-accent-muted/30 transition-all cursor-pointer
                           flex items-start gap-3"
              >
                <span className="text-[10px] text-text-muted mt-1 shrink-0 font-mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-text-secondary group-hover:text-text-primary leading-relaxed transition-colors">
                  {q}
                </span>
                <span className="text-text-muted group-hover:text-accent transition-colors text-sm shrink-0">
                  →
                </span>
              </button>
            ))}
          </div>
        )}
        <p className="text-[10px] text-text-muted text-center mt-5">
          Or type any question below.
        </p>
      </div>
    </div>
  );
}
