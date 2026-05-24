"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CouncilRoom, CouncilMessage, CouncilMember } from "@/types/council.types";
import { PersonaDefinition } from "@/types/persona.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { useCouncil } from "@/hooks/useCouncil";
import { PersonaResponseCard } from "@/components/council/PersonaResponseCard";
import { HandRaisePanel } from "@/components/council/HandRaisePanel";
import { CouncilSummary } from "@/components/council/CouncilSummary";
import { CouncilInput } from "@/components/council/CouncilInput";
import { FollowUpChips } from "@/components/council/FollowUpChips";
import { FeedbackForm } from "@/components/council/FeedbackForm";
import { DisclaimerModal } from "@/components/legal/DisclaimerModal";
import { DisclaimerBanner } from "@/components/legal/DisclaimerBanner";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { SessionArtifact } from "@/components/council/SessionArtifact";
import { extractMentionHandle, getPersonaHandle } from "@/lib/utils";
import { Loader2, Share2, Check } from "lucide-react";

function getPersona(id: string): PersonaDefinition | undefined {
  return getPersonaById(id) || getDomainExpertById(id);
}

function CouncilChatInner() {
  const { roomId } = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const [room, setRoom] = useState<CouncilRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefillInput, setPrefillInput] = useState<string | null>(null);
  const [userSelectedSpeakerId, setUserSelectedSpeakerId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const initialQuestionFired = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, error: councilError, setMessages, askCouncil, stopCouncil } = useCouncil([]);

  // Load room and messages
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/council-rooms/${roomId}`);
        if (!res.ok) throw new Error("Failed to load council");
        const data = await res.json();
        setRoom(data.room);
        setMessages(data.messages ?? []);
      } catch {
        setError("Failed to load this council.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [roomId, setMessages]);

  // Auto-scroll on new messages or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-fire the first question from URL ?q= param (delivered from builder)
  useEffect(() => {
    if (loading || !room || initialQuestionFired.current) return;
    const initialQuestion = searchParams.get("q");
    if (initialQuestion && messages.length === 0 && !isLoading) {
      initialQuestionFired.current = true;
      // Strip ?q= from URL after firing
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url.toString());
      handleQuestion(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, room, messages.length, isLoading]);

  function handleShare() {
    const shareUrl = `${window.location.origin}/share/${roomId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }

  async function handleQuestion(question: string) {
    if (!room) return;
    const members = room.members as CouncilMember[];

    // @mention routing: if question starts with @Handle, only call that one persona
    const handle = extractMentionHandle(question);
    if (handle) {
      const mentionedMember = members.find((m) => {
        const p = getPersona(m.personaId);
        return (
          p &&
          getPersonaHandle(p.name).toLowerCase() === handle.toLowerCase()
        );
      });
      if (mentionedMember) {
        await askCouncil(question, room.id, [mentionedMember], userSelectedSpeakerId || undefined);
        setUserSelectedSpeakerId(null);
        return;
      }
    }

    await askCouncil(question, room.id, members, userSelectedSpeakerId || undefined);
    setUserSelectedSpeakerId(null);
  }

  function handleChipClick(chip: string) {
    setPrefillInput(chip);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-text-secondary">{error || "Council not found."}</p>
      </div>
    );
  }

  const members = room.members as CouncilMember[];
  const personas = members.map((m) => getPersona(m.personaId)).filter(Boolean) as PersonaDefinition[];
  const hasDomainExperts = personas.some((p) => p.personaType === "domain_expert");

  // Is the conversation currently waiting on the user to answer a handoff?
  const latestMessage = messages[messages.length - 1];
  const latestTurn = latestMessage?.conversation_turns?.[latestMessage.conversation_turns.length - 1];
  const isHandoffPending = !isLoading && !!latestTurn?.isHandoff;

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] lg:h-screen">
      {/* Disclaimer modal (one-time) */}
      {hasDomainExperts && <DisclaimerModal personas={personas} />}

      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-surface-border shrink-0">
        <div className="flex -space-x-2">
          {personas.map((p) => (
            <PersonaAvatar
              key={p.id}
              persona={p}
              size="sm"
              className="ring-2 ring-surface"
            />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-serif italic text-text-primary truncate">
            {room.title || "New Council"}
          </h1>
          <p className="text-[11px] text-text-muted">
            {personas.map((p) => p.name).join(" · ")}
          </p>
        </div>
        <button
          onClick={handleShare}
          title="Copy share link"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border hover:border-surface-overlay bg-surface-raised hover:bg-surface-overlay text-xs text-text-muted hover:text-text-secondary transition-colors shrink-0"
        >
          {shareCopied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Share2 size={12} />
              <span>Share</span>
            </>
          )}
        </button>
      </div>

      {/* Disclaimer banner */}
      {hasDomainExperts && (
        <div className="px-6 pt-3 shrink-0">
          <DisclaimerBanner personas={personas} />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <p className="text-sm text-text-secondary mb-2">Your council is assembled.</p>
            <p className="text-xs text-text-muted">Ask them a question below.</p>
          </div>
        )}

        {/* Loading indicator for very first question */}
        {isLoading && messages.length === 0 && (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-muted animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-accent-muted animate-pulse" style={{ animationDelay: '0.15s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-accent-muted animate-pulse" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isLatest = idx === messages.length - 1;
          return (
            <CouncilMessageBlock
              key={msg.id}
              message={msg}
              members={members}
              isLatest={isLatest}
              isActivelyLoading={isLoading && isLatest}
              onChipClick={handleChipClick}
              onPersonaSelected={setUserSelectedSpeakerId}
              userSelectedSpeakerId={userSelectedSpeakerId}
            />
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input — placeholder shifts when latest turn is a handoff */}
      <CouncilInput
        onSubmit={handleQuestion}
        onStop={stopCouncil}
        disabled={isLoading}
        placeholder={
          isHandoffPending
            ? "Answer their question…"
            : `Ask your ${room.title || "council"}…`
        }
        focusRing={isHandoffPending}
        members={members}
        initialValue={prefillInput ?? undefined}
        onInitialValueConsumed={() => setPrefillInput(null)}
      />

      {councilError && (
        <div className="px-6 py-2 text-xs text-red-400 text-center shrink-0">
          {councilError}
        </div>
      )}
    </div>
  );
}

export default function CouncilChatPage() {
  return (
    <Suspense fallback={null}>
      <CouncilChatInner />
    </Suspense>
  );
}

function CouncilMessageBlock({
  message,
  members,
  isLatest,
  isActivelyLoading,
  onChipClick,
  onPersonaSelected,
  userSelectedSpeakerId,
}: {
  message: CouncilMessage;
  members: CouncilMember[];
  isLatest: boolean;
  isActivelyLoading: boolean;
  onChipClick: (chip: string) => void;
  onPersonaSelected?: (personaId: string) => void;
  userSelectedSpeakerId?: string | null;
}) {
  const hasAnyResponse = Object.keys(message.persona_responses).length > 0;
  const moderatorMember = members.find((m) => m.role === "moderator");
  const nonModeratorMembers = members.filter((m) => m.role !== "moderator");
  const hasTurns = message.conversation_turns && message.conversation_turns.length > 0;

  // Find moderator persona
  const moderatorPersona = moderatorMember
    ? getPersonaById(moderatorMember.personaId) || getDomainExpertById(moderatorMember.personaId)
    : null;

  // Is the moderator currently streaming?
  const isModeratorStreaming =
    isActivelyLoading && !!message.streamingModeratorId;

  // Should we show the moderator section at all?
  const showModerator =
    (message.moderator_output && message.moderator_output.length > 0) ||
    isModeratorStreaming;

  // Should we show auto-summary?
  const showAutoSummary =
    !showModerator &&
    ((message.auto_summary && message.auto_summary.length > 0) ||
      (isActivelyLoading && hasAnyResponse && !moderatorMember));

  // Chips: only show on latest, completed message
  const showChips =
    isLatest &&
    !isActivelyLoading &&
    message.suggestedChips &&
    message.suggestedChips.length > 0;

  // Currently streaming persona
  const streamingId = isActivelyLoading ? message.streamingPersonaId : undefined;

  // Hand-raise: show during reaction phase after initial takes, before moderator output
  const showHandRaise =
    isLatest &&
    onPersonaSelected &&
    hasAnyResponse &&
    !showModerator &&
    message.currentPhase === "reaction";

  return (
    <div className="space-y-4">
      {/* User question */}
      <div className="flex justify-end">
        <div className="max-w-2xl rounded-2xl rounded-tr-sm bg-accent-muted/30 border border-accent/20 px-4 py-3">
          <p className="text-sm text-text-primary leading-relaxed">{message.user_prompt}</p>
        </div>
      </div>

      {/* Persona responses — dynamic thread or legacy rendering */}
      {hasTurns ? (
        <div className="space-y-3">
          {/* Completed turns rendered in chronological order */}
          {message.conversation_turns!.map((turn, idx) => {
            const p = getPersona(turn.personaId);
            if (!p) return null;

            // Phase dividers
            const prevTurn = idx > 0 ? message.conversation_turns![idx - 1] : null;
            const isFirstScoping = turn.phase === "scoping" && idx === 0;
            const isFirstInitialAfterScoping =
              turn.phase === "initial" && prevTurn?.phase === "scoping";
            const isFirstReaction =
              turn.phase === "reaction" &&
              (idx === 0 || prevTurn?.phase === "initial" || prevTurn?.phase === "scoping");

            return (
              <div key={`turn-${turn.turnIndex}`}>
                {isFirstScoping && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-surface-border" />
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                      Setting context
                    </span>
                    <div className="h-px flex-1 bg-surface-border" />
                  </div>
                )}
                {isFirstInitialAfterScoping && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-surface-border" />
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                      Takes
                    </span>
                    <div className="h-px flex-1 bg-surface-border" />
                  </div>
                )}
                {isFirstReaction && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-surface-border" />
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                      Reactions
                    </span>
                    <div className="h-px flex-1 bg-surface-border" />
                  </div>
                )}
                <PersonaResponseCard
                  persona={p}
                  response={{ response: turn.response, role: turn.role }}
                  isStreaming={false}
                  speakerSource={turn.speakerSource}
                  hasMemory={!!message.personaMemoryCounts?.[turn.personaId]}
                  isScoping={turn.phase === "scoping"}
                  isHandoff={!!turn.isHandoff}
                />
              </div>
            );
          })}

          {/* Currently streaming persona (not yet in turns array) */}
          {streamingId && !message.conversation_turns!.some(
            (t) => t.personaId === streamingId && t.response === message.persona_responses[streamingId]?.response
          ) && (() => {
            const p = getPersona(streamingId);
            if (!p) return null;
            const streamingResponse = message.persona_responses[streamingId];
            // Check if we're in thinking state (streaming but no response text yet)
            const isThinkingState = !streamingResponse || !streamingResponse.response || streamingResponse.response.length === 0;
            // Show reaction divider if we're in reaction phase and no reaction turns exist yet
            const inReactionPhase = message.currentPhase === "reaction";
            const hasReactionTurns = message.conversation_turns!.some((t) => t.phase === "reaction");
            return (
              <>
                {inReactionPhase && !hasReactionTurns && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-surface-border" />
                    <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
                      Reactions
                    </span>
                    <div className="h-px flex-1 bg-surface-border" />
                  </div>
                )}
                <PersonaResponseCard
                  persona={p}
                  response={streamingResponse ?? { response: "", role: "default" }}
                  isStreaming={!isThinkingState}
                  isThinking={isThinkingState}
                  speakerSource={userSelectedSpeakerId === streamingId ? 'user' : 'director'}
                  hasMemory={!!message.personaMemoryCounts?.[streamingId]}
                />
              </>
            );
          })()}

          {/* Skeletons for personas that haven't spoken yet during initial phase */}
          {isActivelyLoading &&
            message.currentPhase === "initial" &&
            nonModeratorMembers
              .filter((m) => !message.conversation_turns!.some((t) => t.personaId === m.personaId))
              .filter((m) => m.personaId !== streamingId)
              .map((m) => {
                const p = getPersona(m.personaId);
                if (!p) return null;
                return (
                  <PersonaResponseCard
                    key={`skeleton-${m.personaId}`}
                    persona={p}
                    response={{ response: "", role: m.role }}
                    skeleton
                  />
                );
              })}
        </div>
      ) : (
        /* Legacy rendering — member-order grid for old messages */
        <div className="space-y-3">
          {nonModeratorMembers.map((m) => {
            const p = getPersona(m.personaId);
            if (!p) return null;

            const existingResponse = message.persona_responses[m.personaId];
            const isThisPersonaStreaming =
              isActivelyLoading && message.streamingPersonaId === m.personaId;
            const hasNotStarted =
              isActivelyLoading &&
              !existingResponse &&
              !isThisPersonaStreaming;

            if (hasNotStarted) {
              return (
                <PersonaResponseCard
                  key={m.personaId}
                  persona={p}
                  response={{ response: "", role: m.role }}
                  skeleton
                />
              );
            }

            if (existingResponse || isThisPersonaStreaming) {
              return (
                <PersonaResponseCard
                  key={m.personaId}
                  persona={p}
                  response={existingResponse ?? { response: "", role: m.role }}
                  isStreaming={isThisPersonaStreaming}
                />
              );
            }

            return null;
          })}
        </div>
      )}

      {/* Hand-raise panel */}
      {showHandRaise && (
        <HandRaisePanel
          members={nonModeratorMembers}
          onPersonaSelected={onPersonaSelected}
          disabled={userSelectedSpeakerId !== null && userSelectedSpeakerId !== undefined}
        />
      )}

      {/* Moderator output */}
      {showModerator && moderatorPersona && (
        <CouncilSummary
          summary={message.moderator_output ?? ""}
          type="moderator"
          moderatorName={moderatorPersona.name}
          isStreaming={isModeratorStreaming}
        />
      )}

      {/* Auto summary (no moderator) */}
      {showAutoSummary && (
        <CouncilSummary
          summary={message.auto_summary ?? ""}
          type="auto"
          isStreaming={isActivelyLoading && !message.auto_summary}
        />
      )}

      {/* Session artifact — what you came in with vs. walking out with */}
      {isLatest &&
        !isActivelyLoading &&
        message.sessionArtifact && (
          <SessionArtifact artifact={message.sessionArtifact} />
        )}

      {/* Follow-up chips — render as quick replies if the conversation just handed off */}
      {showChips && (() => {
        const lastTurn = message.conversation_turns?.[message.conversation_turns.length - 1];
        return (
          <FollowUpChips
            chips={message.suggestedChips!}
            onChipClick={onChipClick}
            isAnswerOptions={!!lastTurn?.isHandoff}
          />
        );
      })()}

      {/* Feedback (only on latest completed message) */}
      {isLatest &&
        hasAnyResponse &&
        !isActivelyLoading &&
        message.id &&
        !message.id.startsWith("temp-") && (
          <FeedbackForm councilMessageId={message.id} />
        )}
    </div>
  );
}
