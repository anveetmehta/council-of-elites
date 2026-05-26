"use client";

import { useEffect, useState } from "react";
import { getAllPersonas } from "@/data/personas";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { Loader2, Sparkles } from "lucide-react";

interface CouncilEmptyStateProps {
  topic?: string | null;
  onQuestionClick: (question: string) => void;
}

/**
 * Empty state for a new council room.
 *
 * Shows all 8 advisors standing by, with the framing that the conductor
 * will choose who's most relevant when the user asks their question.
 * Also shows 4 AI-suggested questions tailored to the topic.
 */
export function CouncilEmptyState({ topic, onQuestionClick }: CouncilEmptyStateProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const allPersonas = getAllPersonas();

  useEffect(() => {
    const members = allPersonas.map((p) => ({ personaId: p.id, role: "default" as const }));
    fetch("/api/suggested-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ members, topic }),
    })
      .then((r) => (r.ok ? r.json() : { questions: [] }))
      .then((d) => setQuestions(d.questions ?? []))
      .catch(() => setQuestions([]))
      .finally(() => setLoadingQuestions(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  return (
    <div className="max-w-3xl mx-auto py-10 px-2 animate-fade-up">

      {/* Heading */}
      <div className="text-center mb-10">
        <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted mb-3">
          Your council is assembled
        </p>
        <h1 className="text-3xl font-serif italic text-text-primary mb-2">
          {topic
            ? `They're ready to think about ${topic.toLowerCase()}.`
            : "Eight minds. One question."}
        </h1>
        <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
          {topic
            ? "The right advisors will step forward based on what you ask."
            : "Ask what you're actually wrestling with. The relevant voices will find you."}
        </p>
      </div>

      {/* Full roster — all 8 standing by */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {allPersonas.map((p) => (
          <div
            key={p.id}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-surface-border text-center"
            style={{ borderTopWidth: 2, borderTopColor: p.colorHex }}
          >
            <PersonaAvatar persona={p} size="md" />
            <div className="min-w-0 w-full">
              <p className="text-xs font-serif italic text-text-primary font-semibold truncate">
                {p.name}
              </p>
              <p className="text-[9px] text-text-muted leading-tight mt-0.5 line-clamp-2">
                {p.tagline.split(",")[0]}
              </p>
            </div>
          </div>
        ))}
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
          <div className="flex items-center justify-center py-8 text-text-muted">
            <Loader2 size={14} className="animate-spin mr-2" />
            <span className="text-xs">Crafting questions for your council…</span>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-text-muted">
              Just type your real question — specifics work best.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <button
                key={i}
                onClick={() => onQuestionClick(q)}
                className="group w-full text-left p-3.5 rounded-xl bg-white border border-surface-border
                           hover:border-accent/40 hover:bg-accent-muted/30 transition-all cursor-pointer
                           flex items-start gap-3"
              >
                <span className="text-[10px] text-text-muted mt-1 shrink-0 font-mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-text-secondary group-hover:text-text-primary leading-relaxed transition-colors">
                  {q}
                </span>
                <span className="text-text-muted group-hover:text-accent transition-colors text-sm shrink-0 ml-auto">
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
