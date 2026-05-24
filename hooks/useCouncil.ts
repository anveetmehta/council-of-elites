"use client";

import { useState, useCallback, useRef } from "react";
import { CouncilMember, CouncilMessage, ConversationTurn, SSEEvent } from "@/types/council.types";
import { trackEvent, Events } from "@/lib/analytics";

interface UseCouncilReturn {
  messages: CouncilMessage[];
  isLoading: boolean;
  error: string | null;
  setMessages: React.Dispatch<React.SetStateAction<CouncilMessage[]>>;
  askCouncil: (question: string, councilRoomId: string, members: CouncilMember[], userSelectedSpeakerId?: string) => Promise<void>;
  stopCouncil: () => void;
}

export function useCouncil(initialMessages: CouncilMessage[] = []): UseCouncilReturn {
  const [messages, setMessages] = useState<CouncilMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopCouncil = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const askCouncil = useCallback(
    async (question: string, councilRoomId: string, members: CouncilMember[], userSelectedSpeakerId?: string) => {
      setIsLoading(true);
      setError(null);
      // Create a fresh abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Optimistic: add placeholder message immediately
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: CouncilMessage = {
        id: tempId,
        council_room_id: councilRoomId,
        user_prompt: question,
        persona_responses: {},
        moderator_output: null,
        auto_summary: null,
        created_at: new Date().toISOString(),
        conversation_turns: [],
        currentPhase: "initial",
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Token accumulator — batch React re-renders to every 40ms
      const tokenAccumulator: Record<string, string> = {};
      let moderatorAccumulator = "";
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      const turnsAccumulator: ConversationTurn[] = [];
      let currentTurnIndex = 0;

      const scheduleFlush = () => {
        if (flushTimer) return;
        flushTimer = setTimeout(() => {
          flushTimer = null;
          const snapshot = { ...tokenAccumulator };
          const modSnapshot = moderatorAccumulator;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== tempId) return m;
              const updatedResponses = { ...m.persona_responses };
              for (const [personaId, text] of Object.entries(snapshot)) {
                updatedResponses[personaId] = {
                  ...(updatedResponses[personaId] ?? { role: "default" }),
                  response: text,
                };
              }
              return {
                ...m,
                persona_responses: updatedResponses,
                streamingModeratorId: modSnapshot !== m.moderator_output ? m.streamingModeratorId : undefined,
                moderator_output: modSnapshot || m.moderator_output,
              };
            })
          );
        }, 40);
      };

      try {
        const res = await fetch("/api/council", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ councilRoomId, members, question, userSelectedSpeakerId }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to get council response");
        }

        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            let event: SSEEvent;
            try {
              event = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            switch (event.type) {
              case "phase_change": {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId
                      ? { ...m, currentPhase: event.phase }
                      : m
                  )
                );
                break;
              }
              case "persona_thinking": {
                // Just update streaming ID; UI will show thinking state
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId
                      ? { ...m, streamingPersonaId: event.personaId }
                      : m
                  )
                );
                break;
              }
              case "persona_start": {
                // Use turn-indexed key for accumulator (supports same persona speaking twice)
                const turnKey = `${event.personaId}__${currentTurnIndex}`;
                tokenAccumulator[turnKey] = "";
                // Also mirror to persona key for flush display
                tokenAccumulator[event.personaId] = "";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId
                      ? { ...m, streamingPersonaId: event.personaId }
                      : m
                  )
                );
                break;
              }
              case "token": {
                const turnKey = `${event.personaId}__${currentTurnIndex}`;
                tokenAccumulator[turnKey] =
                  (tokenAccumulator[turnKey] ?? "") + event.text;
                // Mirror to persona key so flush picks it up
                tokenAccumulator[event.personaId] = tokenAccumulator[turnKey];
                scheduleFlush();
                break;
              }
              case "turn_done": {
                // Primary handler for new dynamic conversation
                turnsAccumulator.push({
                  turnIndex: event.turnIndex,
                  personaId: event.personaId,
                  role: event.role,
                  phase: event.phase as "scoping" | "initial" | "reaction",
                  response: event.fullResponse,
                  userRequestedSpeaker: event.userRequestedSpeaker,
                  speakerSource: event.speakerSource,
                  isHandoff: event.isHandoff,
                });
                currentTurnIndex = event.turnIndex + 1;

                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.id !== tempId) return m;
                    return {
                      ...m,
                      streamingPersonaId: undefined,
                      conversation_turns: [...turnsAccumulator],
                      persona_responses: {
                        ...m.persona_responses,
                        [event.personaId]: {
                          response: event.fullResponse,
                          role: event.role,
                        },
                      },
                    };
                  })
                );
                break;
              }
              case "persona_done": {
                // Backward compat — still fires alongside turn_done
                // Only update persona_responses (turn_done handles conversation_turns)
                tokenAccumulator[event.personaId] = event.fullResponse;
                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.id !== tempId) return m;
                    return {
                      ...m,
                      streamingPersonaId: undefined,
                      persona_responses: {
                        ...m.persona_responses,
                        [event.personaId]: {
                          response: event.fullResponse,
                          role: event.role,
                        },
                      },
                    };
                  })
                );
                break;
              }
              case "moderator_start": {
                moderatorAccumulator = "";
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId
                      ? { ...m, streamingModeratorId: event.personaId }
                      : m
                  )
                );
                break;
              }
              case "moderator_token": {
                moderatorAccumulator += event.text;
                scheduleFlush();
                break;
              }
              case "moderator_done": {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId
                      ? {
                          ...m,
                          streamingModeratorId: undefined,
                          moderator_output: event.output,
                        }
                      : m
                  )
                );
                moderatorAccumulator = "";
                break;
              }
              case "summary_done": {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId ? { ...m, auto_summary: event.summary } : m
                  )
                );
                break;
              }
              case "chips": {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId
                      ? { ...m, suggestedChips: event.questions }
                      : m
                  )
                );
                break;
              }
              case "session_artifact": {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId
                      ? { ...m, sessionArtifact: event.artifact }
                      : m
                  )
                );
                break;
              }
              case "persona_memories": {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId
                      ? { ...m, personaMemoryCounts: event.counts }
                      : m
                  )
                );
                break;
              }
              case "done": {
                if (flushTimer) {
                  clearTimeout(flushTimer);
                  flushTimer = null;
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId
                      ? { ...m, id: event.councilMessageId ?? tempId }
                      : m
                  )
                );
                trackEvent(Events.COUNCIL_QUESTION_ASKED, {
                  councilRoomId,
                  personaIds: members.map((m) => m.personaId),
                  roles: members.map((m) => m.role),
                  questionLength: question.length,
                });
                break;
              }
              case "error": {
                throw new Error(event.message);
              }
            }
          }
        }
      } catch (err) {
        if (flushTimer) {
          clearTimeout(flushTimer);
        }
        // Check if this was a user-triggered abort
        const isAbort =
          err instanceof DOMException && err.name === "AbortError";
        if (isAbort) {
          // Keep whatever partial response was rendered — don't wipe the message
          // Just silently stop
        } else {
          setError(err instanceof Error ? err.message : "Something went wrong");
          // Remove optimistic message on real errors
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  return { messages, isLoading, error, setMessages, askCouncil, stopCouncil };
}
