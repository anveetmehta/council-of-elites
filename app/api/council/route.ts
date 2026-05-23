import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  streamPersonaWithHistory,
  streamModerator,
  streamReactionTurn,
  callDirector,
  generateAutoSummary,
  generateFollowUpChips,
  generateCouncilTitle,
  generateConversationSummary,
  generateSessionArtifact,
  generateAllStances,
  classifyMove,
  checkInputSafety,
  ConversationEntry,
  PriorRound,
  type StanceMap,
  type MoveType,
} from "@/lib/anthropic/council";
import { CouncilRole } from "@/types/council.types";
import {
  fetchPersonaMemories,
  extractMemoryEntries,
  synthesizeReflection,
  saveMemoryEntries,
  countObservations,
  type MemoryEntry,
} from "@/lib/memory";
import { retrieveKnowledge } from "@/lib/knowledge";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { CouncilMember, PersonaResponse, SSEEvent, ConversationTurn, DirectorDecision } from "@/types/council.types";

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function encodeSSE(event: SSEEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const {
    councilRoomId,
    members,
    question,
    userSelectedSpeakerId,
  }: {
    councilRoomId: string;
    members: CouncilMember[];
    question: string;
    userSelectedSpeakerId?: string;
  } = body;

  if (!councilRoomId || !members || !question) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (members.length < 1 || members.length > 4) {
    return new Response(
      JSON.stringify({ error: "Council must have 1-4 members" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch room (including running conversation summary)
  const { data: room, error: roomErr } = await supabase
    .from("council_rooms")
    .select("id, title, members, conversation_summary")
    .eq("id", councilRoomId)
    .eq("user_id", user.id)
    .single();

  if (roomErr || !room) {
    return new Response(JSON.stringify({ error: "Council room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch last 2 messages for verbatim recent context
  const { data: recentMessages } = await supabase
    .from("council_messages")
    .select("user_prompt, persona_responses, moderator_output, auto_summary")
    .eq("council_room_id", councilRoomId)
    .order("created_at", { ascending: false })
    .limit(2);

  // Safety pre-flight check
  const isSafe = await checkInputSafety(question);
  if (!isSafe) {
    return new Response(
      JSON.stringify({
        error: "This question isn't something the council can help with.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const moderators = members.filter((m) => m.role === "moderator");
  const nonModerators = members.filter((m) => m.role !== "moderator");

  // Build recent verbatim rounds (last 2, chronological order)
  const recentRounds: PriorRound[] = (recentMessages ?? [])
    .reverse()
    .map((msg) => ({
      question: msg.user_prompt,
      responses: Object.entries(
        msg.persona_responses as Record<string, { role: string; response: string }>
      )
        .filter(([, r]) => r.role !== "moderator")
        .map(([personaId, r]) => {
          const p = getPersonaById(personaId) || getDomainExpertById(personaId);
          return { name: p?.name ?? personaId, role: r.role, response: r.response };
        }),
      summary: msg.moderator_output ?? msg.auto_summary ?? undefined,
    }));

  const conversationSummary: string | undefined =
    room.conversation_summary ?? undefined;

  // Build roster for director + roster awareness
  const roster = nonModerators.map((m) => {
    const p = getPersonaById(m.personaId) || getDomainExpertById(m.personaId);
    return { personaId: m.personaId, name: p?.name ?? m.personaId, role: m.role };
  });

  const isSinglePersona = nonModerators.length <= 1;

  // ── Pre-fetch memories for all personas before stream starts ──────────────
  const memoriesMap: Record<string, MemoryEntry[]> = {};
  const memoryCounts: Record<string, number> = {};
  await Promise.all(
    [...nonModerators, ...moderators].map(async (member) => {
      const memories = await fetchPersonaMemories(supabase, user.id, member.personaId);
      if (memories.length > 0) {
        memoriesMap[member.personaId] = memories;
        memoryCounts[member.personaId] = memories.length;
      }
    })
  );

  // ── Retrieve relevant knowledge for all personas (synchronous, in-memory) ──
  const knowledgeMap: Record<string, string[]> = {};
  for (const member of [...nonModerators, ...moderators]) {
    const chunks = retrieveKnowledge(member.personaId, question);
    if (chunks.length > 0) {
      knowledgeMap[member.personaId] = chunks;
    }
  }

  // ── Phase 0 (invisible): Stance priming for all non-moderators ──
  // Generates each persona's instinctive prior position via parallel Haiku calls.
  // Cost: ~400-600ms total. Used to anchor their committed position in prompts.
  const stances: StanceMap = await generateAllStances(nonModerators, question);

  // Build panelist descriptions (with stances) for inter-persona awareness
  const panelistDescriptions = [...nonModerators, ...moderators].map((m) => {
    const p = getPersonaById(m.personaId) || getDomainExpertById(m.personaId);
    return {
      personaId: m.personaId,
      name: p?.name ?? m.personaId,
      tagline: p?.tagline ?? "",
      role: m.role as CouncilRole,
      stance: stances[m.personaId],
    };
  });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encodeSSE(event));
      };

      const allResponses: Record<string, PersonaResponse> = {};
      const conversationHistory: ConversationEntry[] = [];
      const turns: ConversationTurn[] = [];
      let turnIndex = 0;
      let moderatorOutput: string | null = null;
      let autoSummary: string | null = null;

      try {
        // Send memory counts to client so UI can show "memory active" indicators
        if (Object.keys(memoryCounts).length > 0) {
          send({ type: "persona_memories", counts: memoryCounts });
        }

        // ═══ PHASE 1: Initial Takes (shuffled order) ═══
        const shuffledNonModerators = isSinglePersona
          ? nonModerators
          : shuffleArray(nonModerators);

        send({ type: "phase_change", phase: "initial" });

        for (let pIdx = 0; pIdx < shuffledNonModerators.length; pIdx++) {
          const member = shuffledNonModerators[pIdx];
          const persona =
            getPersonaById(member.personaId) ||
            getDomainExpertById(member.personaId);
          if (!persona) continue;

          send({ type: "persona_thinking", personaId: member.personaId });
          await new Promise((resolve) => setTimeout(resolve, 400));

          send({
            type: "persona_start",
            personaId: member.personaId,
            role: member.role,
          });

          const isLastInPhase1 = pIdx === shuffledNonModerators.length - 1;

          const result = await streamPersonaWithHistory(
            member,
            question,
            conversationHistory,
            recentRounds,
            conversationSummary,
            (text) => send({ type: "token", personaId: member.personaId, text }),
            members,
            memoriesMap[member.personaId],
            knowledgeMap[member.personaId],
            stances[member.personaId],
            panelistDescriptions,
            isLastInPhase1
          );

          allResponses[member.personaId] = result;
          conversationHistory.push({
            name: persona.name,
            role: member.role,
            response: result.response,
          });

          const turn: ConversationTurn = {
            turnIndex,
            personaId: member.personaId,
            role: member.role,
            phase: "initial",
            response: result.response,
          };
          turns.push(turn);

          // Send both turn_done (new) and persona_done (backward compat)
          send({
            type: "turn_done",
            turnIndex,
            personaId: member.personaId,
            fullResponse: result.response,
            role: member.role,
            phase: "initial",
          });
          send({
            type: "persona_done",
            personaId: member.personaId,
            fullResponse: result.response,
            role: member.role,
            pauseAfterMs: 1000, // Breathing room between personas
          });

          turnIndex++;
        }

        // ═══ PHASE 2: Director-Driven Reactions (with Hand-Raise Override) ═══
        // Goal: 1-2 inter-advisor reactions, then a designated "user handoff" turn.
        // The conversation should pause and invite the user back in — not loop forever.
        if (!isSinglePersona && nonModerators.length >= 2) {
          // Reactions BEFORE the user handoff. Keep it short — the panel should not
          // talk past the user.
          const interReactions = question.length > 120 ? 2 : question.length > 60 ? 1 : 1;
          // +1 for the handoff turn that addresses the user directly
          const maxReactions = Math.min(nonModerators.length * 2, interReactions + 1);

          send({ type: "phase_change", phase: "reaction" });

          let userSelectionUsed = false;
          let reactionsCompleted = 0;
          const reactionCountsLocal: Record<string, number> = {};
          let lastMoveContext: { moveType: MoveType; addressedTo: string | null } | undefined;

          for (let i = 0; i < maxReactions; i++) {
            // The last iteration is the explicit handoff back to the user.
            const isHandoffTurn = i === maxReactions - 1;
            try {
              const eligibleMembers = nonModerators.filter(
                (m) => (reactionCountsLocal[m.personaId] ?? 0) < 2
              );
              if (eligibleMembers.length === 0) break;

              // Classify the last turn's move type for conditional relevance
              if (turns.length > 0) {
                try {
                  lastMoveContext = await classifyMove(
                    turns[turns.length - 1],
                    roster
                  );
                } catch {
                  lastMoveContext = undefined;
                }
              }

              let reactionMember: CouncilMember | undefined = undefined;
              let decision: DirectorDecision | undefined = undefined;
              let speakerSource: 'user' | 'director' | 'system' = 'director';
              let instruction = "";

              // On first reaction, check if user selected a speaker
              if (i === 0 && userSelectedSpeakerId && !userSelectionUsed) {
                reactionMember = eligibleMembers.find((m) => m.personaId === userSelectedSpeakerId);
                if (reactionMember) {
                  userSelectionUsed = true;
                  speakerSource = 'user';
                  instruction = "Respond to the user's question, building on what others have said. React to their perspectives if relevant.";
                }
              }

              // Conditional relevance: if the last turn directly named someone, prioritize them
              if (!reactionMember && lastMoveContext?.addressedTo) {
                const addressed = lastMoveContext.addressedTo.toLowerCase();
                const addressedMember = eligibleMembers.find((m) => {
                  const name = (getPersonaById(m.personaId) || getDomainExpertById(m.personaId))?.name ?? "";
                  return name.toLowerCase().includes(addressed) || addressed.includes(name.toLowerCase());
                });
                if (addressedMember && (lastMoveContext.moveType === "CHALLENGE" || lastMoveContext.moveType === "QUESTION")) {
                  reactionMember = addressedMember;
                  instruction = lastMoveContext.moveType === "QUESTION"
                    ? `${lastMoveContext.addressedTo} was just directly asked a question. Answer it head-on, naming the question.`
                    : `${lastMoveContext.addressedTo} was just directly challenged. Defend, concede, or counter — but engage the specific claim made against you.`;
                  speakerSource = 'director';
                }
              }

              // Otherwise use director
              if (!reactionMember) {
                decision = await callDirector(
                  question,
                  roster,
                  turns,
                  maxReactions - i,
                  lastMoveContext
                );

                const directorStopping = !decision || !decision.shouldContinue || !decision.nextSpeaker;

                if (directorStopping) {
                  if (reactionsCompleted === 0) {
                    reactionMember =
                      eligibleMembers.find((m) => m.personaId === "sharp-contrarian") ??
                      eligibleMembers[Math.floor(Math.random() * eligibleMembers.length)];
                    instruction = "React to the initial perspectives. Push back on a specific point or build on the most interesting idea raised.";
                    speakerSource = 'director';
                  } else {
                    break;
                  }
                } else {
                  reactionMember = nonModerators.find(
                    (m) => m.personaId === decision!.nextSpeaker
                  );
                  if (!reactionMember) {
                    if (reactionsCompleted === 0) {
                      reactionMember = eligibleMembers[0];
                      instruction = "React to the initial perspectives. Build on or challenge what was said.";
                    } else {
                      break;
                    }
                  }
                  instruction = decision!.instruction;
                  speakerSource = 'director';
                }
              }

              if (!reactionMember) break;

              const reactionPersona =
                getPersonaById(reactionMember.personaId) ||
                getDomainExpertById(reactionMember.personaId);
              if (!reactionPersona) break;

              // ── Handoff turn override ──
              // The last reaction is not advisor-to-advisor — it's advisor-to-user.
              // Override the director's instruction with one that turns the
              // conversation back to the person asking.
              if (isHandoffTurn) {
                instruction = `This is the moment to hand the conversation back to the person who asked. Don't address other panelists. Speak directly to them. In 2-3 sentences: name the specific tension the panel surfaced, then ask them ONE concrete question they need to answer before this conversation can move forward. The question must be answerable — not philosophical. End on that question. Do not summarize.`;
              }

              // Send thinking indicator
              send({ type: "persona_thinking", personaId: reactionMember.personaId });

              // Brief delay to simulate thinking
              await new Promise((resolve) => setTimeout(resolve, 400));

              send({
                type: "persona_start",
                personaId: reactionMember.personaId,
                role: reactionMember.role,
              });

              const result = await streamReactionTurn(
                reactionMember,
                question,
                turns,
                instruction,
                members,
                recentRounds,
                conversationSummary,
                (text) =>
                  send({
                    type: "token",
                    personaId: reactionMember.personaId,
                    text,
                  }),
                memoriesMap[reactionMember.personaId],
                knowledgeMap[reactionMember.personaId],
                stances[reactionMember.personaId],
                panelistDescriptions,
                isHandoffTurn
              );

              // Update allResponses with latest (overwrites initial take)
              allResponses[reactionMember.personaId] = result;

              const turn: ConversationTurn = {
                turnIndex,
                personaId: reactionMember.personaId,
                role: reactionMember.role,
                phase: "reaction",
                response: result.response,
                userRequestedSpeaker: speakerSource === 'user',
                speakerSource,
              };
              turns.push(turn);

              send({
                type: "turn_done",
                turnIndex,
                personaId: reactionMember.personaId,
                fullResponse: result.response,
                role: reactionMember.role,
                phase: "reaction",
                userRequestedSpeaker: speakerSource === 'user',
                speakerSource,
              });
              send({
                type: "persona_done",
                personaId: reactionMember.personaId,
                fullResponse: result.response,
                role: reactionMember.role,
                pauseAfterMs: 1000,
              });

              reactionCountsLocal[reactionMember.personaId] = (reactionCountsLocal[reactionMember.personaId] ?? 0) + 1;
              reactionsCompleted++;
              turnIndex++;
            } catch (err) {
              console.error("Reaction turn failed:", err);
              break; // Graceful exit to wrap-up
            }
          }
        }

        // ═══ PHASE 3: Wrap-Up ═══
        send({ type: "phase_change", phase: "wrap-up" });

        // Moderator runs last, sees full conversation
        if (moderators.length > 0) {
          // Send thinking indicator for moderator
          send({ type: "persona_thinking", personaId: moderators[0].personaId });

          // Brief delay to simulate thinking
          await new Promise((resolve) => setTimeout(resolve, 500));

          send({
            type: "moderator_start",
            personaId: moderators[0].personaId,
          });

          moderatorOutput = await streamModerator(
            moderators[0],
            question,
            allResponses,
            (text) => send({ type: "moderator_token", text }),
            turns,
            memoriesMap[moderators[0].personaId],
            knowledgeMap[moderators[0].personaId],
            stances[moderators[0].personaId],
            panelistDescriptions
          );

          allResponses[moderators[0].personaId] = {
            response: moderatorOutput,
            role: "moderator",
          };

          send({ type: "moderator_done", output: moderatorOutput });
        }

        // Auto-summary if no moderator (and more than one persona)
        if (!moderatorOutput && Object.keys(allResponses).length >= 2) {
          autoSummary = await generateAutoSummary(question, allResponses);
          send({ type: "summary_done", summary: autoSummary });
        }

        // Follow-up chips (tension-driven, with turns context)
        if (members.length >= 2) {
          const chips = await generateFollowUpChips(question, allResponses, turns);
          if (chips.length > 0) {
            send({ type: "chips", questions: chips });
          }
        }

        // ═══ Session Artifact: what they came in with vs. what they're leaving with ═══
        if (turns.length > 0) {
          try {
            const artifact = await generateSessionArtifact(question, turns, moderatorOutput, autoSummary);
            send({ type: "session_artifact", artifact });
          } catch (e) {
            console.error("Session artifact generation failed:", e);
          }
        }

        // Persist council message (both flat + turns)
        const { data: msg, error: msgErr } = await supabase
          .from("council_messages")
          .insert({
            council_room_id: councilRoomId,
            user_prompt: question,
            persona_responses: allResponses,
            moderator_output: moderatorOutput,
            auto_summary: autoSummary,
            conversation_turns: turns.length > 0 ? turns : null,
          })
          .select("id")
          .single();

        if (msgErr) {
          console.error("Failed to persist council message:", msgErr);
        }

        send({ type: "done", councilMessageId: msg?.id ?? null });
        controller.close();

        // Fire-and-forget: update running summary + title + extract memories
        (async () => {
          // ── Conversation summary + title ──────────────────────────────────
          try {
            const newSummary = await generateConversationSummary(
              room.conversation_summary ?? null,
              {
                question,
                responses: conversationHistory,
                roundSummary: moderatorOutput ?? autoSummary ?? undefined,
              }
            );

            const roomUpdate: Record<string, unknown> = {
              conversation_summary: newSummary,
              updated_at: new Date().toISOString(),
            };
            if (!room.title) {
              roomUpdate.title = await generateCouncilTitle(question);
            }
            await supabase
              .from("council_rooms")
              .update(roomUpdate)
              .eq("id", councilRoomId);
          } catch (e) {
            console.error("Background summary update failed:", e);
          }

          // ── Memory extraction: one pass per persona that spoke ─────────────
          for (const member of nonModerators) {
            try {
              const personaTurns = turns.filter((t) => t.personaId === member.personaId);
              if (personaTurns.length === 0) continue;

              const personaResponse = personaTurns.map((t) => t.response).join(" ");
              const entries = await extractMemoryEntries(
                member.personaId,
                question,
                personaResponse,
                turns
              );

              if (entries.length > 0) {
                await saveMemoryEntries(
                  supabase,
                  user.id,
                  member.personaId,
                  entries,
                  "observation",
                  { councilRoomId, sourceMessageId: msg?.id }
                );

                // Trigger reflection synthesis every 8 new observations
                const obsCount = await countObservations(supabase, user.id, member.personaId);
                if (obsCount > 0 && obsCount % 8 === 0) {
                  const allMemories = await fetchPersonaMemories(supabase, user.id, member.personaId, 24);
                  const obsOnly = allMemories.filter((m) => m.memoryType === "observation");
                  if (obsOnly.length >= 4) {
                    const reflections = await synthesizeReflection(member.personaId, obsOnly);
                    if (reflections.length > 0) {
                      await saveMemoryEntries(
                        supabase,
                        user.id,
                        member.personaId,
                        reflections,
                        "reflection",
                        { councilRoomId }
                      );
                    }
                  }
                }
              }
            } catch (e) {
              console.error(`Memory extraction failed for ${member.personaId}:`, e);
            }
          }
        })();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Council stream error:", message);
        send({ type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
