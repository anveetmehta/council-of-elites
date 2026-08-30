"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { CouncilMember, CouncilMessage, ConversationTurn, SSEEvent } from "@/types/council.types";
import { trackEvent, Events } from "@/lib/analytics";

interface UseCouncilReturn {
  messages: CouncilMessage[];
  isLoading: boolean;
  error: string | null;
  selectedSpeakerIds: Set<string>; // Personas selected for current phase
  pendingUserMessage: string | null; // Queued interjection, applied at the next turn boundary
  setMessages: React.Dispatch<React.SetStateAction<CouncilMessage[]>>;
  askCouncil: (question: string, councilRoomId: string, members: CouncilMember[], userSelectedSpeakerId?: string) => Promise<void>;
  interjectCouncil: (text: string) => void;
  stopCouncil: () => void;
}

/** Parse one SSE response body, invoking onEvent for each event as it arrives. */
async function readSSEStream(body: ReadableStream<Uint8Array>, onEvent: (event: SSEEvent) => void): Promise<void> {
  const reader = body.getReader();
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
      onEvent(event);
    }
  }
}

export function useCouncil(initialMessages: CouncilMessage[] = []): UseCouncilReturn {
  const [messages, setMessages] = useState<CouncilMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<Set<string>>(new Set());
  const [pendingUserMessage, setPendingUserMessageState] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);
  const pendingUserMessageRef = useRef<string | null>(null);
  const resumedRef = useRef(false);

  const setPendingUserMessage = useCallback((value: string | null) => {
    pendingUserMessageRef.current = value;
    setPendingUserMessageState(value);
  }, []);

  const stopCouncil = useCallback(() => {
    stoppedRef.current = true;
    abortControllerRef.current?.abort();
  }, []);

  const interjectCouncil = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setPendingUserMessage(text.trim());
    },
    [setPendingUserMessage]
  );

  /**
   * Drives one round to completion by repeatedly calling /api/council/next-turn
   * until it reports roundComplete. Each call streams exactly one turn's worth
   * of SSE events, handled with the same per-event logic used for the old
   * single-shot round — the only new thing is the loop around it, and the
   * pending-interjection check before each iteration.
   */
  const driveRound = useCallback(
    async (params: {
      tempId: string;
      councilRoomId: string;
      councilMessageId: string;
      question: string;
      members: CouncilMember[];
      seedTurns: ConversationTurn[];
    }) => {
      const { tempId, councilRoomId, councilMessageId, question, members, seedTurns } = params;

      const tokenAccumulator: Record<string, string> = {};
      let moderatorAccumulator = "";
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      const turnsAccumulator: ConversationTurn[] = [...seedTurns];
      let currentTurnIndex = seedTurns.length;

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

      const handleEvent = (event: SSEEvent) => {
        switch (event.type) {
          case "phase_change": {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, currentPhase: event.phase } : m)));
            break;
          }
          case "persona_thinking": {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, streamingPersonaId: event.personaId } : m)));
            break;
          }
          case "persona_start": {
            const turnKey = `${event.personaId}__${currentTurnIndex}`;
            tokenAccumulator[turnKey] = "";
            tokenAccumulator[event.personaId] = "";
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, streamingPersonaId: event.personaId } : m)));
            break;
          }
          case "token": {
            const turnKey = `${event.personaId}__${currentTurnIndex}`;
            tokenAccumulator[turnKey] = (tokenAccumulator[turnKey] ?? "") + event.text;
            tokenAccumulator[event.personaId] = tokenAccumulator[turnKey];
            scheduleFlush();
            break;
          }
          case "turn_done": {
            turnsAccumulator.push({
              turnIndex: event.turnIndex,
              personaId: event.personaId,
              role: event.role,
              phase: event.phase as "scoping" | "initial" | "reaction",
              response: event.fullResponse,
              userRequestedSpeaker: event.userRequestedSpeaker,
              speakerSource: event.speakerSource,
              isHandoff: event.isHandoff,
              moveType: event.moveType,
              addressedTo: event.addressedTo,
              userInterjection: event.userInterjection,
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
                    [event.personaId]: { response: event.fullResponse, role: event.role },
                  },
                };
              })
            );
            break;
          }
          case "persona_done": {
            tokenAccumulator[event.personaId] = event.fullResponse;
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== tempId) return m;
                return {
                  ...m,
                  streamingPersonaId: undefined,
                  persona_responses: { ...m.persona_responses, [event.personaId]: { response: event.fullResponse, role: event.role } },
                };
              })
            );
            break;
          }
          case "moderator_start": {
            moderatorAccumulator = "";
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, streamingModeratorId: event.personaId } : m)));
            break;
          }
          case "moderator_token": {
            moderatorAccumulator += event.text;
            scheduleFlush();
            break;
          }
          case "moderator_done": {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, streamingModeratorId: undefined, moderator_output: event.output } : m)));
            moderatorAccumulator = "";
            break;
          }
          case "summary_done": {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, auto_summary: event.summary } : m)));
            break;
          }
          case "chips": {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, suggestedChips: event.questions } : m)));
            break;
          }
          case "session_artifact": {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, sessionArtifact: event.artifact } : m)));
            break;
          }
          case "persona_memories": {
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, personaMemoryCounts: event.counts } : m)));
            break;
          }
          case "speakers_selected": {
            setSelectedSpeakerIds(new Set(event.phasePersonaIds));
            break;
          }
          case "round_step_done": {
            // Loop control only — no message mutation here.
            break;
          }
          case "done": {
            if (flushTimer) {
              clearTimeout(flushTimer);
              flushTimer = null;
            }
            setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: event.councilMessageId ?? tempId, status: "completed" } : m)));
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
      };

      try {
        let roundComplete = false;
        while (!roundComplete && !stoppedRef.current) {
          const toSend = pendingUserMessageRef.current;
          if (toSend) setPendingUserMessage(null);

          const abortController = new AbortController();
          abortControllerRef.current = abortController;

          const res = await fetch("/api/council/next-turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ councilRoomId, councilMessageId, userMessage: toSend ?? undefined }),
            signal: abortController.signal,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to advance the round");
          }
          if (!res.body) throw new Error("No response body");

          let stepComplete = false;
          await readSSEStream(res.body, (event) => {
            if (event.type === "round_step_done") stepComplete = event.roundComplete;
            handleEvent(event);
          });
          roundComplete = stepComplete;
        }
      } catch (err) {
        if (flushTimer) clearTimeout(flushTimer);
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        if (!isAbort) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
        stoppedRef.current = false;
      }
    },
    [setPendingUserMessage]
  );

  const askCouncil = useCallback(
    async (question: string, councilRoomId: string, members: CouncilMember[], userSelectedSpeakerId?: string) => {
      setIsLoading(true);
      setError(null);
      stoppedRef.current = false;

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
        status: "in_progress",
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const res = await fetch("/api/council/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ councilRoomId, members, question, userSelectedSpeakerId }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to start the council");
        }

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("text/event-stream")) {
          // Trivial-question short circuit: a single self-contained SSE round.
          if (!res.body) throw new Error("No response body");
          const handleTrivialEvent = (event: SSEEvent) => {
            if (event.type === "error") throw new Error(event.message);
            // Reuse the same per-event handling as a normal round by delegating
            // through a minimal inline switch — trivial rounds only ever emit
            // a small subset (speakers_selected, phase_change, persona_*, token,
            // turn_done, done), all already handled generically below.
            switch (event.type) {
              case "speakers_selected":
                setSelectedSpeakerIds(new Set(event.phasePersonaIds));
                break;
              case "phase_change":
                setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, currentPhase: event.phase } : m)));
                break;
              case "persona_thinking":
              case "persona_start":
                setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, streamingPersonaId: event.personaId } : m)));
                break;
              case "token":
                setMessages((prev) =>
                  prev.map((m) => {
                    if (m.id !== tempId) return m;
                    const existing = m.persona_responses[event.personaId]?.response ?? "";
                    return {
                      ...m,
                      persona_responses: { ...m.persona_responses, [event.personaId]: { response: existing + event.text, role: "default" } },
                    };
                  })
                );
                break;
              case "turn_done":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId
                      ? {
                          ...m,
                          streamingPersonaId: undefined,
                          conversation_turns: [
                            {
                              turnIndex: event.turnIndex,
                              personaId: event.personaId,
                              role: event.role,
                              phase: event.phase as "scoping" | "initial" | "reaction",
                              response: event.fullResponse,
                              speakerSource: event.speakerSource,
                              isHandoff: event.isHandoff,
                            },
                          ],
                          persona_responses: { ...m.persona_responses, [event.personaId]: { response: event.fullResponse, role: event.role } },
                        }
                      : m
                  )
                );
                break;
              case "done":
                setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, id: event.councilMessageId ?? tempId, status: "completed" } : m)));
                trackEvent(Events.COUNCIL_QUESTION_ASKED, {
                  councilRoomId,
                  personaIds: members.map((m) => m.personaId),
                  roles: members.map((m) => m.role),
                  questionLength: question.length,
                });
                break;
            }
          };
          await readSSEStream(res.body, handleTrivialEvent);
          setIsLoading(false);
          abortControllerRef.current = null;
          return;
        }

        // Non-trivial: /start returns JSON, then the client drives next-turn.
        const started: { councilMessageId: string; phase: string; phase1PersonaIds: string[]; memoryCounts: Record<string, number> } = await res.json();

        setSelectedSpeakerIds(new Set(started.phase1PersonaIds));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  currentPhase: started.phase === "scoping" ? "scoping" : "initial",
                  personaMemoryCounts: Object.keys(started.memoryCounts).length > 0 ? started.memoryCounts : undefined,
                }
              : m
          )
        );

        await driveRound({
          tempId,
          councilRoomId,
          councilMessageId: started.councilMessageId,
          question,
          members,
          seedTurns: [],
        });
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        if (isAbort) {
          // Keep whatever partial state was rendered — don't wipe the message.
          setIsLoading(false);
          abortControllerRef.current = null;
        } else {
          setError(err instanceof Error ? err.message : "Something went wrong");
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [driveRound]
  );

  // Resume any round left in_progress by a refresh or crash — picks up the
  // turn-by-turn loop exactly where it left off using what's already persisted.
  useEffect(() => {
    if (resumedRef.current) return;
    const inProgress = initialMessages.find((m) => m.status === "in_progress");
    if (!inProgress) return;
    resumedRef.current = true;

    setIsLoading(true);
    stoppedRef.current = false;
    driveRound({
      tempId: inProgress.id,
      councilRoomId: inProgress.council_room_id,
      councilMessageId: inProgress.id,
      question: inProgress.user_prompt,
      members: [],
      seedTurns: inProgress.conversation_turns ?? [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    messages,
    isLoading,
    error,
    selectedSpeakerIds,
    pendingUserMessage,
    setMessages,
    askCouncil,
    interjectCouncil,
    stopCouncil,
  };
}
