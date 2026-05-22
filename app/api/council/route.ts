import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  streamPersonaWithHistory,
  streamPersonaIntroduction,
  streamModerator,
  streamReactionTurn,
  callDirector,
  generateAutoSummary,
  generateFollowUpChips,
  generateCouncilTitle,
  generateConversationSummary,
  generateSessionArtifact,
  checkInputSafety,
  ConversationEntry,
  PriorRound,
} from "@/lib/anthropic/council";
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
        // ═══ PHASE 0: Introductions ═══
        send({ type: "phase_change", phase: "introduction" });

        for (const member of nonModerators) {
          const persona =
            getPersonaById(member.personaId) ||
            getDomainExpertById(member.personaId);
          if (!persona) continue;

          // Send thinking indicator before intro
          send({ type: "persona_thinking", personaId: member.personaId });

          // Brief delay to simulate thinking
          await new Promise((resolve) => setTimeout(resolve, 300));

          send({
            type: "persona_start",
            personaId: member.personaId,
            role: member.role,
          });

          const result = await streamPersonaIntroduction(
            member,
            (text) => send({ type: "token", personaId: member.personaId, text })
          );

          // Intro doesn't get persisted in conversation_turns or persona_responses
          // It's just for initial engagement

          send({
            type: "persona_done",
            personaId: member.personaId,
            fullResponse: result.response,
            role: member.role,
            pauseAfterMs: 800, // Breathing room after each intro
          });
        }

        // ═══ PHASE 1: Initial Takes (shuffled order) ═══
        const shuffledNonModerators = isSinglePersona
          ? nonModerators
          : shuffleArray(nonModerators);

        send({ type: "phase_change", phase: "initial" });

        for (const member of shuffledNonModerators) {
          const persona =
            getPersonaById(member.personaId) ||
            getDomainExpertById(member.personaId);
          if (!persona) continue;

          // Send thinking indicator before response
          send({ type: "persona_thinking", personaId: member.personaId });

          // Brief delay to simulate thinking
          await new Promise((resolve) => setTimeout(resolve, 400));

          send({
            type: "persona_start",
            personaId: member.personaId,
            role: member.role,
          });

          const result = await streamPersonaWithHistory(
            member,
            question,
            conversationHistory,
            recentRounds,
            conversationSummary,
            (text) => send({ type: "token", personaId: member.personaId, text }),
            members // roster for system prompt
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
        if (!isSinglePersona && nonModerators.length >= 2) {
          const maxReactions = Math.min(nonModerators.length, 4);

          send({ type: "phase_change", phase: "reaction" });

          // Track if user has already made a hand-raise selection in this round
          let userSelectionUsed = false;

          for (let i = 0; i < maxReactions; i++) {
            try {
              let reactionMember: CouncilMember | undefined = undefined;
              let decision: DirectorDecision | undefined = undefined;
              let speakerSource: 'user' | 'director' | 'system' = 'director';
              let instruction = "";

              // On first reaction, check if user selected a speaker
              if (i === 0 && userSelectedSpeakerId && !userSelectionUsed) {
                reactionMember = nonModerators.find((m) => m.personaId === userSelectedSpeakerId);
                if (reactionMember) {
                  userSelectionUsed = true;
                  speakerSource = 'user';
                  instruction = "Respond to the user's question, building on what others have said. React to their perspectives if relevant.";
                }
              }

              // If no user selection or not first reaction, use director
              if (!reactionMember) {
                decision = await callDirector(
                  question,
                  roster,
                  turns,
                  maxReactions - i
                );

                if (!decision || !decision.shouldContinue || !decision.nextSpeaker) break;

                reactionMember = nonModerators.find(
                  (m) => m.personaId === decision!.nextSpeaker
                );
                instruction = decision!.instruction;
                speakerSource = 'director';
              }

              if (!reactionMember) break;

              const reactionPersona =
                getPersonaById(reactionMember.personaId) ||
                getDomainExpertById(reactionMember.personaId);
              if (!reactionPersona) break;

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
                  })
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
                pauseAfterMs: 1000, // Breathing room between personas
              });

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
            turns
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

        // Fire-and-forget: update running summary + title
        (async () => {
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
