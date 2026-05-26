/**
 * Council Conductor
 *
 * An LLM-powered orchestrator that watches the conversation and decides:
 *   - Who speaks next (and in what order)
 *   - What their intent should be (challenge, build, concretize, mirror, etc.)
 *   - When to hand back to the user
 *
 * v1: Dynamic speaker selection for Phase 1 (initial takes) and Phase 2 (reactions).
 * Future: Pathology detection, debate-staging, tool routing, memory surfacing.
 */

import { getAnthropicClient } from "@/lib/anthropic/client";
import { getAllPersonas } from "@/data/personas";
import type { PersonaDefinition } from "@/types/persona.types";
import type { CouncilMember } from "@/types/council.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpeakerIntent =
  | "challenge"        // Push back on a point made
  | "build"            // Extend or add to a point
  | "concretize"       // Translate abstraction into specific/actionable
  | "invert"           // Show the failure case or downside
  | "mirror"           // Reflect the emotional dimension back
  | "quantify"         // Put a number on something
  | "reframe"          // Change the whole framing of the question
  | "historicize"      // Bring a long-arc or precedent lens
  | "synthesize";      // Pull threads together

export interface ConductorSpeaker {
  personaId: string;
  intent: SpeakerIntent;
  briefing?: string; // Optional 1-sentence context injection for this speaker's prompt
}

export interface ConductorDecision {
  speakers: ConductorSpeaker[]; // Ordered 2-4 speakers
  reasoning: string;            // Logged — not shown to user
}

export interface ConductorInput {
  question: string;
  allMembers: CouncilMember[];         // Full 8-member roster
  conversationHistory?: string;        // Serialized prior turns if any
  userMessage?: string;               // Latest user message (for follow-ups)
  phase: "initial" | "reaction";
  previousSpeakers?: string[];        // Persona IDs who just spoke (avoid repeats)
}

// ─── Persona summary for the conductor's context ─────────────────────────────

function buildRosterSummary(members: CouncilMember[]): string {
  const all = getAllPersonas();
  return members
    .map((m) => {
      const p = all.find((x) => x.id === m.personaId);
      if (!p) return null;
      const tags = (p.conductorTags ?? []).slice(0, 6).join(", ");
      return `- ${p.id} | ${p.name} (${p.tagline}) | triggers: ${tags}`;
    })
    .filter(Boolean)
    .join("\n");
}

// ─── Main conductor call ──────────────────────────────────────────────────────

export async function conductorSelectSpeakers(
  input: ConductorInput
): Promise<ConductorDecision> {
  const rosterSummary = buildRosterSummary(input.allMembers);
  const isFollowUp = !!input.conversationHistory;

  const phaseInstruction =
    input.phase === "initial"
      ? `This is the INITIAL TAKES phase. Select 2-4 advisors whose perspectives are most distinct and relevant to this question. Vary the angles — don't select people who will say the same thing.`
      : `This is the REACTION phase. Select 2-3 advisors to react to what has already been said. Prioritize: (1) anyone whose claim was directly challenged, (2) someone who can concretize the most abstract point, (3) someone who hasn't yet spoken.`;

  const historySection = input.conversationHistory
    ? `\nRecent conversation:\n${input.conversationHistory}\n`
    : "";

  const avoidSection =
    input.previousSpeakers && input.previousSpeakers.length > 0
      ? `\nAvoid selecting these (already spoke): ${input.previousSpeakers.join(", ")}`
      : "";

  const prompt = `You are the Conductor of a council of advisors. Your job is to pick the right 2-4 advisors to speak, in the right order, for maximum value.

THE QUESTION:
"${input.question}"
${historySection}
AVAILABLE ADVISORS (id | name | specialty | trigger topics):
${rosterSummary}
${avoidSection}

${phaseInstruction}

SPEAKER INTENTS you can assign:
- challenge: push back on something already said or assumed
- build: extend or deepen a relevant point
- concretize: translate abstraction into something specific and actionable
- invert: surface the failure case, downside, or risk
- mirror: reflect the emotional/identity dimension underneath the question
- quantify: put a specific number or math on something
- reframe: change the entire framing of the question
- historicize: bring a long-arc or historical precedent lens
- synthesize: pull threads together toward a conclusion

RULES:
- Select 2-4 advisors (2 for simple/clear questions, 4 for complex/contested ones)
- No two advisors should have the same intent unless the question is very complex
- Prefer advisors whose conductorTags overlap with the question's domain
- For "mirror" intent, always use imani-wright
- For "quantify" intent, always use hana-mori
- For "historicize" intent, always use tomas-rivera
- For "reframe" intent, prefer eitan-bergmann

Return ONLY valid JSON in this exact shape, no prose:
{
  "speakers": [
    { "personaId": "maya-krishnan", "intent": "challenge", "briefing": "optional one sentence to inject into her prompt" },
    { "personaId": "hana-mori", "intent": "quantify" }
  ],
  "reasoning": "one sentence explaining the selection"
}`;

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") return fallbackDecision(input, isFollowUp);

    const text = content.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackDecision(input, isFollowUp);

    const parsed = JSON.parse(jsonMatch[0]) as ConductorDecision;

    // Validate
    if (!Array.isArray(parsed.speakers) || parsed.speakers.length < 2) {
      return fallbackDecision(input, isFollowUp);
    }

    // Ensure all selected persona IDs exist in the roster
    const validIds = new Set(input.allMembers.map((m) => m.personaId));
    const validSpeakers = parsed.speakers.filter((s) => validIds.has(s.personaId));

    if (validSpeakers.length < 2) return fallbackDecision(input, isFollowUp);

    return { speakers: validSpeakers, reasoning: parsed.reasoning ?? "" };
  } catch (err) {
    console.error("[Conductor] selection failed:", err);
    return fallbackDecision(input, isFollowUp);
  }
}

// ─── Fallback: graceful degradation to first 3 members ───────────────────────

function fallbackDecision(
  input: ConductorInput,
  _isFollowUp: boolean
): ConductorDecision {
  const candidates = input.allMembers
    .filter((m) => !input.previousSpeakers?.includes(m.personaId))
    .slice(0, 3);

  const fallbackIntents: SpeakerIntent[] = ["build", "challenge", "concretize"];
  const speakers: ConductorSpeaker[] = candidates.map((m, i) => ({
    personaId: m.personaId,
    intent: fallbackIntents[i] ?? "build",
  }));

  return {
    speakers,
    reasoning: "fallback: conductor call failed, using first available members",
  };
}

// ─── Build member list from CouncilRoom members ───────────────────────────────

/**
 * Given the full 8-member roster from a council room,
 * return it as a CouncilMember array for the conductor.
 */
export function buildConductorRoster(
  members: CouncilMember[],
  excludeIds?: string[]
): CouncilMember[] {
  return members.filter((m) => !excludeIds?.includes(m.personaId));
}
