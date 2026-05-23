import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CouncilMember, CouncilRole, ConversationTurn, SessionArtifact } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { PersonaDefinition } from "@/types/persona.types";
import { ArrowDown } from "lucide-react";

// DB row shape (snake_case, subset of columns)
interface DbMessage {
  id: string;
  user_prompt: string;
  persona_responses: Record<string, { response: string; role: CouncilRole }>;
  conversation_turns: ConversationTurn[] | null;
  moderator_output: string | null;
  auto_summary: string | null;
  session_artifact: SessionArtifact | null;
  created_at: string;
}

function getPersona(id: string): PersonaDefinition | undefined {
  return getPersonaById(id) || getDomainExpertById(id);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: room } = await supabase
    .from("council_rooms")
    .select("title, topic")
    .eq("id", id)
    .single();

  return {
    title: room?.title
      ? `${room.title} — Council of Elites`
      : "Shared Session — Council of Elites",
    description: room?.topic ?? "A multi-perspective AI council session.",
  };
}

export default async function SharePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("council_rooms")
    .select("id, title, topic, members, created_at")
    .eq("id", id)
    .single();

  if (!room) return notFound();

  const { data: messages } = await supabase
    .from("council_messages")
    .select(
      "id, user_prompt, persona_responses, conversation_turns, moderator_output, auto_summary, session_artifact, created_at"
    )
    .eq("council_room_id", id)
    .order("created_at", { ascending: true });

  const members = (room.members as unknown as CouncilMember[]) ?? [];
  const personas = members
    .map((m) => getPersona(m.personaId))
    .filter(Boolean) as PersonaDefinition[];

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-surface-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-accent-muted border border-accent/30 flex items-center justify-center shrink-0">
              <span className="text-accent text-[10px]">✦</span>
            </div>
            <span className="text-sm font-serif italic text-text-primary">Council of Elites</span>
          </div>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg border border-surface-border bg-surface-raised hover:bg-surface-overlay text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            Start your own council →
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Session header */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex -space-x-2">
              {personas.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="w-8 h-8 rounded-lg border-2 border-surface flex items-center justify-center text-sm shrink-0"
                  style={{ backgroundColor: `${p.colorHex}22` }}
                >
                  {p.icon ?? <span className="text-xs font-bold" style={{ color: p.colorHex }}>{p.name[0]}</span>}
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Shared session</p>
            </div>
          </div>
          <h1 className="text-2xl font-serif italic text-text-primary mb-1">
            {room.title || "Council Session"}
          </h1>
          <p className="text-sm text-text-muted">
            {personas.map((p) => p.name).join(" · ")}
          </p>
        </div>

        {/* Messages */}
        <div className="space-y-10">
          {(messages ?? []).map((msg) => (
            <SharedMessageBlock key={msg.id} message={msg as unknown as DbMessage} members={members} />
          ))}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-surface-border pt-8 text-center">
          <p className="text-sm text-text-secondary mb-4">
            Want to consult your own council of advisors?
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-sm font-medium text-white transition-colors"
          >
            Assemble your council →
          </Link>
        </div>
      </div>
    </div>
  );
}

function SharedMessageBlock({
  message,
  members,
}: {
  message: DbMessage;
  members: CouncilMember[];
}) {
  const hasTurns = message.conversation_turns && message.conversation_turns.length > 0;
  const moderatorMember = members.find((m) => m.role === "moderator");
  const nonModeratorMembers = members.filter((m) => m.role !== "moderator");
  const artifact = message.session_artifact ?? undefined;

  return (
    <div className="space-y-4">
      {/* User question */}
      <div className="flex justify-end">
        <div className="max-w-xl rounded-2xl rounded-tr-sm bg-accent-muted/30 border border-accent/20 px-4 py-3">
          <p className="text-sm text-text-primary leading-relaxed">{message.user_prompt}</p>
        </div>
      </div>

      {/* Responses */}
      {hasTurns ? (
        <div className="space-y-3">
          {message.conversation_turns!.map((turn, idx) => {
            const p = getPersona(turn.personaId);
            if (!p) return null;
            const isFirstReaction =
              turn.phase === "reaction" &&
              (idx === 0 || message.conversation_turns![idx - 1].phase === "initial");
            return (
              <div key={`turn-${turn.turnIndex}`}>
                {isFirstReaction && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-surface-border" />
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Reactions</span>
                    <div className="h-px flex-1 bg-surface-border" />
                  </div>
                )}
                <SharedResponseCard persona={p} response={turn.response} role={turn.role} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {nonModeratorMembers.map((m) => {
            const p = getPersona(m.personaId);
            if (!p) return null;
            const r = message.persona_responses[m.personaId];
            if (!r) return null;
            return (
              <SharedResponseCard key={m.personaId} persona={p} response={r.response} role={r.role} />
            );
          })}
        </div>
      )}

      {/* Moderator / summary */}
      {message.moderator_output && moderatorMember && (
        <div className="rounded-xl border border-surface-border bg-surface-raised/50 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted mb-2">
            {getPersona(moderatorMember.personaId)?.name ?? "Moderator"} synthesizes
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">{message.moderator_output}</p>
        </div>
      )}
      {message.auto_summary && !message.moderator_output && (
        <div className="rounded-xl border border-surface-border bg-surface-raised/50 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted mb-2">Summary</p>
          <p className="text-sm text-text-secondary leading-relaxed">{message.auto_summary}</p>
        </div>
      )}

      {/* Session Artifact */}
      {artifact && (
        <div className="rounded-xl border border-accent/30 bg-gradient-to-b from-accent/8 to-transparent overflow-hidden">
          <div className="px-5 py-3 border-b border-accent/15 flex items-center gap-2">
            <span className="text-accent text-xs">✦</span>
            <span className="text-[11px] uppercase tracking-widest font-semibold text-accent">Session Clarity</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">Came in with</p>
              <p className="text-sm text-text-secondary leading-relaxed">{artifact.cameInWith}</p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowDown size={13} className="text-accent/40" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">Walking out with</p>
              <p className="text-sm text-text-primary leading-relaxed font-medium">{artifact.walkingOutWith}</p>
            </div>
            {artifact.keyDecision && (
              <div className="pt-4 border-t border-accent/15">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted mb-2">The question only you can answer</p>
                <p className="text-sm text-accent leading-relaxed italic">"{artifact.keyDecision}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SharedResponseCard({
  persona,
  response,
  role,
}: {
  persona: PersonaDefinition;
  response: string;
  role: string;
}) {
  return (
    <div
      className="rounded-xl border border-surface-border bg-surface-raised p-4 border-l-4"
      style={{ borderLeftColor: persona.colorHex }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{ backgroundColor: `${persona.colorHex}22` }}
        >
          {persona.icon ?? (
            <span className="text-xs font-bold" style={{ color: persona.colorHex }}>
              {persona.name[0]}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-text-primary font-serif">{persona.name}</p>
          <p className="text-[10px] text-text-muted">{persona.tagline}</p>
        </div>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{response}</p>
    </div>
  );
}
