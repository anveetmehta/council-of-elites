"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent, Events } from "@/lib/analytics";
import { getDefaultCouncilMembers, getAllPersonas } from "@/data/personas";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * Council creation — new model.
 *
 * No member selection. The user types their question or topic,
 * we create a room with all 8 SMEs as members, and the conductor
 * picks who speaks per round. Friction removed entirely.
 */
export default function NewCouncilPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState(searchParams.get("q") ?? searchParams.get("topic") ?? "");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const allPersonas = getAllPersonas();

  async function handleStart() {
    const q = question.trim();
    if (!q || creating) return;

    setCreating(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // All 8 SMEs are always members — conductor selects who speaks
      const members = getDefaultCouncilMembers();

      const { data, error: err } = await supabase
        .from("council_rooms")
        .insert({
          user_id: user.id,
          members,
          mode: "open",
          topic: q,
        })
        .select("id")
        .single();

      if (err) throw err;

      trackEvent(Events.COUNCIL_CREATED, {
        memberCount: members.length,
        mode: "open",
        hasCustomRoles: false,
        conductorDriven: true,
      });

      router.push(`/council/${data.id}?q=${encodeURIComponent(q)}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setCreating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-3">
            Council of Elites
          </p>
          <h1 className="text-3xl font-serif italic text-text-primary mb-3 leading-tight">
            What are you wrestling with?
          </h1>
          <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
            Eight advisors are standing by. Type your real question — the one
            you'd actually pay a great consultant to think through with you.
          </p>
        </div>

        {/* Input */}
        <div className="relative mb-4">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Should I raise a seed round now, or wait until I have more traction?"
            autoFocus
            rows={3}
            className="w-full px-5 py-4 rounded-2xl text-sm bg-white border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 resize-none leading-relaxed shadow-sm transition-all"
          />
          <button
            onClick={handleStart}
            disabled={!question.trim() || creating}
            className="absolute bottom-3 right-3 w-9 h-9 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {creating ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <ArrowRight size={14} className="text-white" />
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-text-muted mb-12">
          Press Enter to start · Shift+Enter for new line
        </p>

        {error && (
          <p className="text-center text-xs text-red-400 mb-8">{error}</p>
        )}

        {/* The roster — who's waiting */}
        <div className="border-t border-surface-border pt-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted text-center mb-5">
            Your council
          </p>
          <div className="grid grid-cols-4 gap-3">
            {allPersonas.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-2 text-center group">
                <div className="relative">
                  <PersonaAvatar persona={p} size="md" className="group-hover:scale-105 transition-transform" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-text-primary leading-tight">
                    {p.name.split(" ")[0]}
                  </p>
                  <p className="text-[9px] text-text-muted leading-tight mt-0.5 max-w-[80px] mx-auto line-clamp-2">
                    {p.tagline.split(",")[0]}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-text-muted mt-6">
            The right ones will step forward based on your question.
          </p>
        </div>
      </div>
    </div>
  );
}
