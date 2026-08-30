import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  streamScopingTurn,
  streamPersonaWithHistory,
  streamReactionTurn,
  streamModerator,
  callDirector,
  classifyMove,
  shouldWrapUpReactions,
  generateAutoSummary,
  generateFollowUpChips,
  generateCouncilTitle,
  generateConversationSummary,
  generateSessionArtifact,
  ConversationEntry,
  type MoveType,
} from "@/lib/anthropic/council";
import {
  extractMemoryEntries,
  synthesizeReflection,
  saveMemoryEntries,
  countObservations,
  fetchPersonaMemories,
} from "@/lib/memory";
import { conductorSelectSpeakers } from "@/lib/anthropic/conductor";
import { selectInterventionPersona, getBriefingForIntervention, logPathologyAction } from "@/lib/anthropic/pathology-actions";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { splitMembers, buildRoster, buildPanelistDescriptions, buildMemoriesAndKnowledge, encodeSSE } from "@/lib/anthropic/round-context";
import {
  CouncilMember,
  PersonaResponse,
  SSEEvent,
  ConversationTurn,
  RoundState,
  DirectorDecision,
} from "@/types/council.types";

const REACTION_HARD_CAP = 4;

/**
 * POST /api/council/next-turn — generates exactly the next turn of an
 * in-progress round and persists it immediately, then reports whether the
 * round is complete. The client calls this in a loop (see hooks/useCouncil.ts)
 * until it gets roundComplete:true.
 *
 * A present `userMessage` is folded into the reaction phase's speaker
 * cascade as a forced instruction for whoever speaks next — this is the
 * entire mechanism behind letting the user interject mid-round.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { councilRoomId, councilMessageId, userMessage }: {
    councilRoomId: string;
    councilMessageId: string;
    userMessage?: string;
  } = body;

  if (!councilRoomId || !councilMessageId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: room, error: roomErr } = await supabase
    .from("council_rooms")
    .select("id")
    .eq("id", councilRoomId)
    .eq("user_id", user.id)
    .single();
  if (roomErr || !room) {
    return NextResponse.json({ error: "Council room not found" }, { status: 404 });
  }

  const { data: msg, error: msgErr } = await supabase
    .from("council_messages")
    .select("id, persona_responses, conversation_turns, status, round_state")
    .eq("id", councilMessageId)
    .eq("council_room_id", councilRoomId)
    .single();

  if (msgErr || !msg) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }
  if (msg.status !== "in_progress" || !msg.round_state) {
    return NextResponse.json({ error: "Round is not in progress", status: msg.status }, { status: 409 });
  }

  const roundState: RoundState = msg.round_state;
  const turns: ConversationTurn[] = (msg.conversation_turns as ConversationTurn[] | null) ?? [];
  const allResponses: Record<string, PersonaResponse> = (msg.persona_responses as Record<string, PersonaResponse> | null) ?? {};

  const { members, question } = roundState;
  const { moderators, nonModerators } = splitMembers(members);
  const isSinglePersona = nonModerators.length <= 1;
  const rosterSmall = buildRoster(nonModerators);
  const panelistDescriptions = buildPanelistDescriptions([...nonModerators, ...moderators], roundState.stances);
  const { memoriesMap, knowledgeMap } = await buildMemoriesAndKnowledge(
    supabase,
    user.id,
    [...nonModerators, ...moderators],
    question
  );

  let turnIndex = turns.length;
  let roundComplete = false;
  let moderatorOutput: string | null = null;
  let autoSummary: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => controller.enqueue(encodeSSE(event));

      try {
        // ═══ SCOPING STEP ═══
        if (roundState.phase === "scoping" && roundState.scoperPersonaId) {
          const scoper = nonModerators.find((m) => m.personaId === roundState.scoperPersonaId)!;
          const scoperPersona = getPersonaById(scoper.personaId) || getDomainExpertById(scoper.personaId);

          send({ type: "persona_thinking", personaId: scoper.personaId });
          await new Promise((r) => setTimeout(r, 400));
          send({ type: "persona_start", personaId: scoper.personaId, role: scoper.role });

          const result = await streamScopingTurn(
            scoper,
            question,
            (text) => send({ type: "token", personaId: scoper.personaId, text }),
            panelistDescriptions,
            roundState.stances[scoper.personaId]
          );

          allResponses[scoper.personaId] = result;
          const turn: ConversationTurn = {
            turnIndex,
            personaId: scoper.personaId,
            role: scoper.role,
            phase: "scoping",
            response: result.response,
            speakerSource: "system",
          };
          turns.push(turn);
          send({ type: "turn_done", turnIndex, personaId: scoper.personaId, fullResponse: result.response, role: scoper.role, phase: "scoping", speakerSource: "system" });
          send({ type: "persona_done", personaId: scoper.personaId, fullResponse: result.response, role: scoper.role, pauseAfterMs: 800 });
          turnIndex++;

          roundState.phase = "initial";
          void scoperPersona;

          send({ type: "speakers_selected", phasePersonaIds: roundState.phase1MemberIds });
          send({ type: "phase_change", phase: "initial" });
        }

        // ═══ INITIAL TAKES STEP ═══
        else if (roundState.phase === "initial") {
          const member = members.find((m) => m.personaId === roundState.phase1MemberIds[roundState.phase1Index])!;
          const persona = getPersonaById(member.personaId) || getDomainExpertById(member.personaId);

          send({ type: "persona_thinking", personaId: member.personaId });
          await new Promise((r) => setTimeout(r, 400));
          send({ type: "persona_start", personaId: member.personaId, role: member.role });

          const isLastInPhase1 = roundState.phase1Index === roundState.phase1MemberIds.length - 1;
          const history: ConversationEntry[] = turns.map((t) => {
            const p = getPersonaById(t.personaId) || getDomainExpertById(t.personaId);
            return { name: p?.name ?? t.personaId, role: t.role, response: t.response };
          });

          const result = await streamPersonaWithHistory(
            member,
            question,
            history,
            roundState.recentRounds,
            roundState.conversationSummary,
            (text) => send({ type: "token", personaId: member.personaId, text }),
            members,
            memoriesMap[member.personaId],
            knowledgeMap[member.personaId],
            roundState.stances[member.personaId],
            panelistDescriptions,
            isLastInPhase1
          );

          allResponses[member.personaId] = result;
          const turn: ConversationTurn = {
            turnIndex,
            personaId: member.personaId,
            role: member.role,
            phase: "initial",
            response: result.response,
          };
          turns.push(turn);
          send({ type: "turn_done", turnIndex, personaId: member.personaId, fullResponse: result.response, role: member.role, phase: "initial" });
          send({ type: "persona_done", personaId: member.personaId, fullResponse: result.response, role: member.role, pauseAfterMs: 1000 });
          turnIndex++;

          roundState.phase1Index++;

          if (roundState.phase1Index >= roundState.phase1MemberIds.length) {
            if (isSinglePersona) {
              roundState.phase = "wrapup";
            } else {
              roundState.phase = "reaction";
              send({ type: "phase_change", phase: "reaction" });

              // Reaction-order + pathology conductor call — computed once, the
              // moment the reaction phase opens (same as the old single-request
              // flow did before its reaction loop started).
              if (nonModerators.length > 2) {
                try {
                  const serializedHistory = turns
                    .slice(-4)
                    .map((t) => {
                      const p = getPersonaById(t.personaId) || getDomainExpertById(t.personaId);
                      return `${p?.name ?? t.personaId}: ${t.response.slice(0, 120)}...`;
                    })
                    .join("\n");
                  const reactionDecision = await conductorSelectSpeakers({
                    question,
                    allMembers: nonModerators,
                    phase: "reaction",
                    conversationHistory: serializedHistory,
                    previousSpeakers: roundState.phase1MemberIds,
                  });

                  roundState.reactionPathology = reactionDecision.observation?.pathology ?? "none";

                  if (reactionDecision.observation && reactionDecision.observation.pathology !== "none") {
                    const pathologyPersonaId = selectInterventionPersona(
                      reactionDecision.observation.pathology,
                      nonModerators,
                      history
                    );
                    if (pathologyPersonaId) {
                      logPathologyAction(reactionDecision.observation.pathology, pathologyPersonaId, getBriefingForIntervention(reactionDecision.observation.pathology));
                      roundState.conductorReactionOrder = [pathologyPersonaId, ...reactionDecision.speakers.map((s) => s.personaId).filter((id) => id !== pathologyPersonaId)];
                    } else {
                      roundState.conductorReactionOrder = reactionDecision.speakers.map((s) => s.personaId);
                    }
                  } else {
                    roundState.conductorReactionOrder = reactionDecision.speakers.map((s) => s.personaId);
                  }
                } catch {
                  roundState.conductorReactionOrder = [];
                }
              }
              roundState.reactionSetupDone = true;
            }
          }
        }

        // ═══ REACTION STEP ═══
        else if (roundState.phase === "reaction") {
          const moveHistory: MoveType[] = turns
            .filter((t) => t.phase === "reaction" && t.moveType)
            .map((t) => t.moveType!);

          const wrapDecision = shouldWrapUpReactions({
            moveHistory,
            pathology: roundState.reactionPathology,
            reactionsCompleted: roundState.reactionsCompleted,
            hardCap: REACTION_HARD_CAP,
          });
          let isHandoffTurn = wrapDecision.stop;

          const eligibleMembers = nonModerators.filter((m) => (roundState.reactionCountsLocal[m.personaId] ?? 0) < 2);
          if (eligibleMembers.length === 0) isHandoffTurn = true;
          const speakerPool = eligibleMembers.length > 0 ? eligibleMembers : nonModerators;

          const lastTurn = turns[turns.length - 1];
          let reactionMember: CouncilMember | undefined;
          let instruction = "";
          let speakerSource: "user" | "director" | "system" = "director";

          if (userMessage && userMessage.trim()) {
            // Interjection override: whoever the normal cascade would pick,
            // but the instruction now points them at what the user just said.
            instruction = `The user just interjected with: "${userMessage.trim()}". Respond to this directly before anything else — this takes priority over reacting to other panelists.`;
            speakerSource = "user";
          } else if (roundState.reactionsCompleted === 0 && roundState.userSelectedSpeakerId && !roundState.userSelectionUsed) {
            reactionMember = speakerPool.find((m) => m.personaId === roundState.userSelectedSpeakerId);
            if (reactionMember) {
              roundState.userSelectionUsed = true;
              speakerSource = "user";
              instruction = "Respond to the user's question, building on what others have said. React to their perspectives if relevant.";
            }
          } else if (lastTurn?.addressedTo) {
            const addressed = lastTurn.addressedTo.toLowerCase();
            const addressedMember = speakerPool.find((m) => {
              const name = (getPersonaById(m.personaId) || getDomainExpertById(m.personaId))?.name ?? "";
              return name.toLowerCase().includes(addressed) || addressed.includes(name.toLowerCase());
            });
            if (addressedMember && (lastTurn.moveType === "CHALLENGE" || lastTurn.moveType === "QUESTION")) {
              reactionMember = addressedMember;
              instruction = lastTurn.moveType === "QUESTION"
                ? `${lastTurn.addressedTo} was just directly asked a question. Answer it head-on, naming the question.`
                : `${lastTurn.addressedTo} was just directly challenged. Defend, concede, or counter — but engage the specific claim made against you.`;
            }
          }

          if (!reactionMember && !instruction) {
            if (roundState.conductorReactionOrder.length > 0) {
              const nextId = roundState.conductorReactionOrder.find((id) => speakerPool.some((m) => m.personaId === id));
              if (nextId) {
                reactionMember = speakerPool.find((m) => m.personaId === nextId);
                roundState.conductorReactionOrder = roundState.conductorReactionOrder.filter((id) => id !== nextId);
                instruction = "React to what has been said. Build on, challenge, or reframe a specific point.";
              }
            }
          }

          if (!reactionMember && !instruction) {
            let decision: DirectorDecision | undefined;
            try {
              decision = await callDirector(
                question,
                rosterSmall,
                turns,
                REACTION_HARD_CAP - roundState.reactionsCompleted,
                lastTurn?.moveType ? { moveType: lastTurn.moveType, addressedTo: lastTurn.addressedTo ?? null } : undefined
              );
            } catch {
              decision = undefined;
            }
            if (decision?.nextSpeaker) {
              reactionMember = nonModerators.find((m) => m.personaId === decision!.nextSpeaker);
              instruction = decision!.instruction;
            }
            if (!reactionMember) {
              reactionMember = speakerPool.find((m) => m.personaId === "eitan-bergmann") ?? speakerPool[Math.floor(Math.random() * speakerPool.length)];
              instruction = "React to the initial perspectives. Push back on a specific point or build on the most interesting idea raised.";
            }
          } else if (!reactionMember) {
            // userMessage path set an instruction but no specific speaker yet
            reactionMember =
              (roundState.conductorReactionOrder.length > 0
                ? speakerPool.find((m) => m.personaId === roundState.conductorReactionOrder[0])
                : undefined) ?? speakerPool[0];
            if (roundState.conductorReactionOrder.length > 0) {
              roundState.conductorReactionOrder = roundState.conductorReactionOrder.filter((id) => id !== reactionMember!.personaId);
            }
          }

          if (isHandoffTurn) {
            instruction =
              userMessage && userMessage.trim()
                ? `The user just said: "${userMessage.trim()}". This is also the moment to hand the conversation back to them — engage what they just said directly, don't address other panelists, and end with ONE concrete, answerable question that moves things forward.`
                : `This is the moment to hand the conversation back to the person who asked. Don't address other panelists. Speak directly to them. In 2-3 sentences: name the specific tension the panel surfaced, then ask them ONE concrete question they need to answer before this conversation can move forward. The question must be answerable — not philosophical. End on that question. Do not summarize.`;
          }

          send({ type: "persona_thinking", personaId: reactionMember.personaId });
          await new Promise((r) => setTimeout(r, 400));
          send({ type: "persona_start", personaId: reactionMember.personaId, role: reactionMember.role });

          const result = await streamReactionTurn(
            reactionMember,
            question,
            turns,
            instruction,
            members,
            roundState.recentRounds,
            roundState.conversationSummary,
            (text) => send({ type: "token", personaId: reactionMember!.personaId, text }),
            memoriesMap[reactionMember.personaId],
            knowledgeMap[reactionMember.personaId],
            roundState.stances[reactionMember.personaId],
            panelistDescriptions,
            isHandoffTurn
          );

          allResponses[reactionMember.personaId] = result;

          const turn: ConversationTurn = {
            turnIndex,
            personaId: reactionMember.personaId,
            role: reactionMember.role,
            phase: "reaction",
            response: result.response,
            userRequestedSpeaker: speakerSource === "user",
            speakerSource,
            isHandoff: isHandoffTurn,
            userInterjection: userMessage && userMessage.trim() ? userMessage.trim() : undefined,
          };

          // Classify this turn's move right away — the next reaction step reads
          // moveType/addressedTo straight off the turn instead of a separate
          // "lastMoveContext" local.
          if (!isHandoffTurn) {
            try {
              const move = await classifyMove(turn, rosterSmall);
              turn.moveType = move.moveType;
              turn.addressedTo = move.addressedTo;
            } catch {
              // leave unclassified — shouldWrapUpReactions treats it as no signal
            }
          }

          turns.push(turn);
          send({
            type: "turn_done",
            turnIndex,
            personaId: reactionMember.personaId,
            fullResponse: result.response,
            role: reactionMember.role,
            phase: "reaction",
            isHandoff: isHandoffTurn,
            userRequestedSpeaker: speakerSource === "user",
            speakerSource,
            moveType: turn.moveType,
            addressedTo: turn.addressedTo,
            userInterjection: turn.userInterjection,
          });
          send({ type: "persona_done", personaId: reactionMember.personaId, fullResponse: result.response, role: reactionMember.role, pauseAfterMs: 1000 });

          roundState.reactionCountsLocal[reactionMember.personaId] = (roundState.reactionCountsLocal[reactionMember.personaId] ?? 0) + 1;
          roundState.reactionsCompleted++;
          turnIndex++;

          if (isHandoffTurn) {
            roundState.phase = "wrapup";
          }
        }

        // ═══ WRAP-UP STEP ═══
        if (roundState.phase === "wrapup") {
          send({ type: "phase_change", phase: "wrap-up" });

          if (moderators.length > 0) {
            send({ type: "persona_thinking", personaId: moderators[0].personaId });
            await new Promise((r) => setTimeout(r, 500));
            send({ type: "moderator_start", personaId: moderators[0].personaId });

            moderatorOutput = await streamModerator(
              moderators[0],
              question,
              allResponses,
              (text) => send({ type: "moderator_token", text }),
              turns,
              memoriesMap[moderators[0].personaId],
              knowledgeMap[moderators[0].personaId],
              roundState.stances[moderators[0].personaId],
              panelistDescriptions
            );
            allResponses[moderators[0].personaId] = { response: moderatorOutput, role: "moderator" };
            send({ type: "moderator_done", output: moderatorOutput });
          }

          if (!moderatorOutput && Object.keys(allResponses).length >= 2) {
            autoSummary = await generateAutoSummary(question, allResponses);
            send({ type: "summary_done", summary: autoSummary });
          }

          if (members.length >= 2) {
            const chips = await generateFollowUpChips(question, allResponses, turns);
            if (chips.length > 0) send({ type: "chips", questions: chips });
          }

          if (turns.length > 0) {
            try {
              const artifact = await generateSessionArtifact(question, turns, moderatorOutput, autoSummary);
              send({ type: "session_artifact", artifact });
            } catch (e) {
              console.error("Session artifact generation failed:", e);
            }
          }

          roundComplete = true;
        }

        // ── Persist this step (incremental — this is the resumability primitive) ──
        await supabase
          .from("council_messages")
          .update({
            persona_responses: allResponses,
            conversation_turns: turns,
            moderator_output: moderatorOutput,
            auto_summary: autoSummary,
            status: roundComplete ? "completed" : "in_progress",
            round_state: roundComplete ? null : roundState,
          })
          .eq("id", councilMessageId);

        send({ type: "round_step_done", roundComplete, councilMessageId });
        if (roundComplete) send({ type: "done", councilMessageId });
        controller.close();

        if (roundComplete) {
          // Fire-and-forget: update running summary + title + extract memories.
          (async () => {
            try {
              const conversationHistory: ConversationEntry[] = turns.map((t) => {
                const p = getPersonaById(t.personaId) || getDomainExpertById(t.personaId);
                return { name: p?.name ?? t.personaId, role: t.role, response: t.response };
              });
              const newSummary = await generateConversationSummary(roundState.conversationSummary ?? null, {
                question,
                responses: conversationHistory,
                roundSummary: moderatorOutput ?? autoSummary ?? undefined,
              });
              const roomUpdate: Record<string, unknown> = {
                conversation_summary: newSummary,
                updated_at: new Date().toISOString(),
              };
              if (roundState.roomTitleMissing) {
                roomUpdate.title = await generateCouncilTitle(question);
              }
              await supabase.from("council_rooms").update(roomUpdate).eq("id", councilRoomId);
            } catch (e) {
              console.error("Background summary update failed:", e);
            }

            for (const member of nonModerators) {
              try {
                const personaTurns = turns.filter((t) => t.personaId === member.personaId);
                if (personaTurns.length === 0) continue;
                const personaResponse = personaTurns.map((t) => t.response).join(" ");
                const entries = await extractMemoryEntries(member.personaId, question, personaResponse, turns);
                if (entries.length > 0) {
                  await saveMemoryEntries(supabase, user.id, member.personaId, entries, "observation", {
                    councilRoomId,
                    sourceMessageId: councilMessageId,
                  });
                  const obsCount = await countObservations(supabase, user.id, member.personaId);
                  if (obsCount > 0 && obsCount % 8 === 0) {
                    const allMemories = await fetchPersonaMemories(supabase, user.id, member.personaId, 24);
                    const obsOnly = allMemories.filter((m) => m.memoryType === "observation");
                    if (obsOnly.length >= 4) {
                      const reflections = await synthesizeReflection(member.personaId, obsOnly);
                      if (reflections.length > 0) {
                        await saveMemoryEntries(supabase, user.id, member.personaId, reflections, "reflection", { councilRoomId });
                      }
                    }
                  }
                }
              } catch (e) {
                console.error(`Memory extraction failed for ${member.personaId}:`, e);
              }
            }
          })();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("next-turn error:", message);
        try {
          await supabase.from("council_messages").update({ status: "failed" }).eq("id", councilMessageId);
        } catch {
          // best-effort
        }
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
