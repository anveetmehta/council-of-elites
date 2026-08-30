import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkInputSafety,
  classifyStakes,
  selectTrivialAdvisor,
  streamTrivialResponse,
  classifyNeedsScoping,
  generateAllStances,
  PriorRound,
  type StanceMap,
} from "@/lib/anthropic/council";
import { conductorSelectSpeakers } from "@/lib/anthropic/conductor";
import { selectInterventionPersona, getBriefingForIntervention, logPathologyAction } from "@/lib/anthropic/pathology-actions";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { splitMembers, encodeSSE, buildMemoriesAndKnowledge } from "@/lib/anthropic/round-context";
import { CouncilMember, PersonaResponse, SSEEvent, ConversationTurn, RoundState } from "@/types/council.types";

/**
 * POST /api/council/start — setup only, no persona streaming (except the
 * trivial-question short-circuit, which stays a single self-contained SSE
 * response exactly like the old /api/council route, since it's inherently
 * one turn and splitting it buys nothing).
 *
 * For every other question: runs everything that used to happen once before
 * the old route's big streaming closure (safety check, stance priming, the
 * scoping decision, Phase 1 speaker selection), inserts the round as
 * status='in_progress', and returns { councilMessageId } as plain JSON. The
 * client then drives the round forward with repeated calls to
 * /api/council/next-turn.
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
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (members.length < 1 || members.length > 10) {
    return NextResponse.json({ error: "Council must have 1-10 members" }, { status: 400 });
  }

  const { data: room, error: roomErr } = await supabase
    .from("council_rooms")
    .select("id, title, members, conversation_summary")
    .eq("id", councilRoomId)
    .eq("user_id", user.id)
    .single();

  if (roomErr || !room) {
    return NextResponse.json({ error: "Council room not found" }, { status: 404 });
  }

  // Only ever use a fully finished round as "recent context" — an in_progress
  // row from a round that was abandoned mid-way shouldn't leak partial state
  // into a new round.
  const { data: recentMessages } = await supabase
    .from("council_messages")
    .select("user_prompt, persona_responses, moderator_output, auto_summary")
    .eq("council_room_id", councilRoomId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(2);

  const isSafe = await checkInputSafety(question);
  if (!isSafe) {
    return NextResponse.json(
      { error: "This question isn't something the council can help with." },
      { status: 400 }
    );
  }

  const { moderators, nonModerators } = splitMembers(members);

  // ── Stakes classification: short-circuit trivial questions ────────────────
  const isFirstTurn = (recentMessages?.length ?? 0) === 0;
  const userPickedSpeaker = Boolean(userSelectedSpeakerId);
  let stakes: "trivial" | "moderate" | "consequential" = "moderate";
  if (isFirstTurn && !userPickedSpeaker && nonModerators.length >= 2) {
    try {
      stakes = await classifyStakes(question);
    } catch {
      stakes = "moderate";
    }
  }

  if (stakes === "trivial") {
    const advisor = selectTrivialAdvisor(question, nonModerators);
    if (advisor) {
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: SSEEvent) => controller.enqueue(encodeSSE(event));
          try {
            send({ type: "speakers_selected", phasePersonaIds: [advisor.personaId] });
            send({ type: "phase_change", phase: "initial" });
            send({ type: "persona_thinking", personaId: advisor.personaId });
            send({ type: "persona_start", personaId: advisor.personaId, role: advisor.role });

            const trivialResult = await streamTrivialResponse(advisor, question, (text) =>
              send({ type: "token", personaId: advisor.personaId, text })
            );

            const trivialTurn: ConversationTurn = {
              turnIndex: 0,
              personaId: advisor.personaId,
              role: advisor.role,
              phase: "initial",
              response: trivialResult.response,
              speakerSource: "system",
              isHandoff: true,
            };

            send({
              type: "turn_done",
              turnIndex: 0,
              personaId: advisor.personaId,
              role: advisor.role,
              phase: "initial",
              fullResponse: trivialResult.response,
              speakerSource: "system",
              isHandoff: true,
            });
            send({
              type: "persona_done",
              personaId: advisor.personaId,
              role: advisor.role,
              fullResponse: trivialResult.response,
            });

            const allResponses: Record<string, PersonaResponse> = {
              [advisor.personaId]: trivialResult,
            };
            const { data: msg } = await supabase
              .from("council_messages")
              .insert({
                council_room_id: councilRoomId,
                user_prompt: question,
                persona_responses: allResponses,
                moderator_output: null,
                auto_summary: null,
                conversation_turns: [trivialTurn],
                status: "completed",
              })
              .select("id")
              .single();

            send({ type: "done", councilMessageId: msg?.id ?? null });
            controller.close();
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Trivial path failed";
            send({ type: "error", message: errorMessage });
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
  }

  // ── Everything below sets up round_state for the turn-by-turn engine ──────
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

  const isSinglePersona = nonModerators.length <= 1;

  // Phase 0 (invisible): stance priming for all non-moderators.
  const stances: StanceMap = await generateAllStances(nonModerators, question);

  // ── Scoping decision (not streamed here — next-turn streams it) ───────────
  let scoperPersonaId: string | null = null;
  let initialPhase: RoundState["phase"] = "initial";
  if (!isSinglePersona && recentRounds.length === 0 && nonModerators.length >= 2) {
    try {
      const needsScoping = await classifyNeedsScoping(question);
      if (needsScoping) {
        const scoper =
          nonModerators.find((m) => m.personaId === "eitan-bergmann") ??
          nonModerators.find((m) => m.personaId === "maya-krishnan") ??
          nonModerators.find((m) => m.role === "critic") ??
          nonModerators[0];
        const scoperPersona = getPersonaById(scoper.personaId) || getDomainExpertById(scoper.personaId);
        if (scoperPersona) {
          scoperPersonaId = scoper.personaId;
          initialPhase = "scoping";
        }
      }
    } catch (err) {
      console.error("Scoping decision failed:", err);
    }
  }

  // ── Phase 1 speaker selection (conductor), excluding whoever just scoped ──
  const phase1Pool = scoperPersonaId
    ? nonModerators.filter((m) => m.personaId !== scoperPersonaId)
    : nonModerators;
  let phase1Members: CouncilMember[] = phase1Pool;
  if (!isSinglePersona && phase1Pool.length > 2) {
    try {
      const decision = await conductorSelectSpeakers({
        question,
        allMembers: phase1Pool,
        phase: "initial",
      });

      if (decision.observation && decision.observation.pathology !== "none") {
        const pathologyPersonaId = selectInterventionPersona(decision.observation.pathology, phase1Pool, []);
        if (pathologyPersonaId) {
          const briefing = getBriefingForIntervention(decision.observation.pathology);
          logPathologyAction(decision.observation.pathology, pathologyPersonaId, briefing);
          const interventionMember = phase1Pool.find((m) => m.personaId === pathologyPersonaId);
          if (interventionMember) {
            phase1Members = [interventionMember];
            stances[pathologyPersonaId] = (stances[pathologyPersonaId] ?? "") + `\n\n[Conductor Intervention]: ${briefing}`;
          }
        } else {
          const selectedIds = decision.speakers.map((s) => s.personaId);
          phase1Members = selectedIds.map((id) => phase1Pool.find((m) => m.personaId === id)).filter((m): m is CouncilMember => !!m);
        }
      } else {
        const selectedIds = decision.speakers.map((s) => s.personaId);
        phase1Members = selectedIds.map((id) => phase1Pool.find((m) => m.personaId === id)).filter((m): m is CouncilMember => !!m);
      }

      for (const speaker of decision.speakers) {
        if (speaker.briefing && stances[speaker.personaId] !== undefined && !stances[speaker.personaId].includes("[Conductor")) {
          stances[speaker.personaId] = (stances[speaker.personaId] ?? "") + `\n\n[Conductor briefing: ${speaker.briefing}]`;
        }
      }
    } catch (err) {
      console.error("[Conductor] Phase 1 selection failed, using fallback:", err);
      phase1Members = phase1Pool.slice(0, 3);
    }
  }

  const roundState: RoundState = {
    phase: initialPhase,
    question,
    members,
    userSelectedSpeakerId,
    stances,
    scoperPersonaId,
    phase1MemberIds: phase1Members.map((m) => m.personaId),
    phase1Index: 0,
    conductorReactionOrder: [],
    reactionSetupDone: false,
    reactionPathology: "none",
    userSelectionUsed: false,
    reactionCountsLocal: {},
    reactionsCompleted: 0,
    recentRounds,
    conversationSummary: room.conversation_summary ?? undefined,
    roomTitleMissing: !room.title,
  };

  const { data: msg, error: msgErr } = await supabase
    .from("council_messages")
    .insert({
      council_room_id: councilRoomId,
      user_prompt: question,
      persona_responses: {},
      moderator_output: null,
      auto_summary: null,
      conversation_turns: [],
      status: "in_progress",
      round_state: roundState,
    })
    .select("id")
    .single();

  if (msgErr || !msg) {
    console.error("Failed to create round:", msgErr);
    return NextResponse.json({ error: "Failed to start round" }, { status: 500 });
  }

  // Memory counts so the client can show "Knows you" badges immediately —
  // computed here for a fast first paint; next-turn recomputes the full
  // memoriesMap fresh per call rather than persisting it into round_state.
  const { memoryCounts } = await buildMemoriesAndKnowledge(supabase, user.id, [...nonModerators, ...moderators], question);

  return NextResponse.json({
    councilMessageId: msg.id,
    phase: roundState.phase,
    phase1PersonaIds: roundState.phase1MemberIds,
    memoryCounts,
  });
}
