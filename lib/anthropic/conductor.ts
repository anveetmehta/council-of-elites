/**
 * Council Conductor
 *
 * An LLM-powered orchestrator that:
 *   v1 — Picks which advisors speak each round (dynamic speaker selection)
 *   v2 — Detects conversation pathologies and observes user temperature
 *
 * Every call returns both a speaker decision AND an observation block.
 * The observation block is logged and drives actions in later iterations.
 */

import { getAnthropicClient } from "@/lib/anthropic/client";
import { getAllPersonas } from "@/data/personas";
import type { CouncilMember } from "@/types/council.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpeakerIntent =
  | "challenge"        // Push back on a point made
  | "build"            // Extend or add to a point
  | "concretize"       // Translate abstraction into specific/actionable
  | "invert"           // Show the failure case or downside
  | "mirror"           // Reflect the emotional dimension back
  | "quantify"         // Put a number on something — triggers Hana
  | "reframe"          // Change the whole framing of the question
  | "historicize"      // Bring a long-arc or precedent lens
  | "synthesize";      // Pull threads together

export type ConversationPathology =
  | "validation_loop"     // 3+ advisors agreeing in a row, no pushback
  | "abstraction_spiral"  // Each turn more abstract than the last
  | "echo_chamber"        // Same point restated in different voices
  | "topic_drift"         // Wandering from the real question
  | "sycophancy_creep"    // Hedging, softening, over-qualifying
  | "user_disengaged"     // User replies getting shorter / withdrawing
  | "stuck_in_circles"    // 3+ turns, no new ground covered
  | "none";               // No pathology detected

export type UserTemperature =
  | "engaged"       // Active, specific, leaning in
  | "processing"    // Quiet — thinking, not withdrawing
  | "withdrawing"   // Short replies, monosyllabic, trailing off
  | "frustrated"    // Expressing confusion or irritation
  | "unknown";      // Initial question, no signal yet

export interface ConductorObservation {
  pathology: ConversationPathology;
  userTemperature: UserTemperature;
  openThreads: string[];          // Unresolved sub-questions still on the table
  conversationState: "productive" | "circling" | "resolving";
  suggestedIntervention?: string; // What the conductor thinks should happen next (future use)
}

export interface ConductorSpeaker {
  personaId: string;
  intent: SpeakerIntent;
  briefing?: string; // 1-sentence context injection for this speaker's prompt
}

export interface ConductorDecision {
  speakers: ConductorSpeaker[];       // Ordered 2-4 speakers
  observation: ConductorObservation;  // Pathology + state — logged for quality tracking
  reasoning: string;                  // Why these speakers were chosen
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

  const pathologyGuide = input.conversationHistory
    ? `
PATHOLOGY DETECTION — also observe the conversation and report:
- validation_loop: 3+ advisors agreeing in a row with no real pushback
- abstraction_spiral: conversation getting more abstract instead of more concrete
- echo_chamber: same point restated in different voices, no new ground
- topic_drift: wandering from the original question to something adjacent
- sycophancy_creep: hedging, softening, over-qualifying — no one says anything sharp
- user_disengaged: user's replies are getting shorter, more vague, or withdrawing
- stuck_in_circles: 3+ turns, no new information or position change
- none: conversation is healthy

USER TEMPERATURE:
- engaged: asking specific follow-ups, providing new information, leaning in
- processing: quiet but the silence feels like thinking, not withdrawal
- withdrawing: replies shrinking, shorter, less committed
- frustrated: expressing confusion, repeating themselves, or sounding irritated
- unknown: this is the first question, no signal yet`
    : "";

  const prompt = `You are the Conductor of a council of advisors. Pick the right 2-4 advisors AND observe the conversation's health.

THE QUESTION:
"${input.question}"
${historySection}
AVAILABLE ADVISORS (id | name | specialty | trigger topics):
${rosterSummary}
${avoidSection}

${phaseInstruction}

SPEAKER INTENTS:
- challenge: push back on something said or assumed
- build: extend or deepen a relevant point
- concretize: translate abstraction into specific/actionable
- invert: surface the failure case, downside, or risk
- mirror: reflect the emotional/identity dimension
- quantify: put a specific number or math on something
- reframe: change the entire framing of the question
- historicize: bring a long-arc or historical precedent lens
- synthesize: pull threads together

SPEAKER SELECTION RULES:
- Select 2-4 advisors (2 for simple questions, 3-4 for complex/contested)
- No two advisors should have the same intent unless unavoidable
- Prefer advisors whose conductorTags overlap with the question's domain
- For "mirror" intent → always imani-wright
- For "quantify" intent → always hana-mori (she has a calculator tool)
- For "historicize" intent → always tomas-rivera
- For "reframe" intent → prefer eitan-bergmann
${pathologyGuide}

Return ONLY valid JSON, no prose:
{
  "speakers": [
    { "personaId": "maya-krishnan", "intent": "challenge", "briefing": "optional one sentence context for her prompt" },
    { "personaId": "hana-mori", "intent": "quantify" }
  ],
  "observation": {
    "pathology": "none",
    "userTemperature": "unknown",
    "openThreads": ["what their runway actually is", "whether the market is actually contested"],
    "conversationState": "productive",
    "suggestedIntervention": null
  },
  "reasoning": "one sentence explaining the selection"
}`;

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") return fallbackDecision(input, isFollowUp);

    const text = content.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackDecision(input, isFollowUp);

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate speakers
    if (!Array.isArray(parsed.speakers) || parsed.speakers.length < 2) {
      return fallbackDecision(input, isFollowUp);
    }

    // Ensure all selected persona IDs exist in the roster
    const validIds = new Set(input.allMembers.map((m) => m.personaId));
    const validSpeakers = (parsed.speakers as ConductorSpeaker[]).filter(
      (s) => validIds.has(s.personaId)
    );

    if (validSpeakers.length < 2) return fallbackDecision(input, isFollowUp);

    // Parse observation block (non-fatal if missing)
    const observation: ConductorObservation = {
      pathology: parsed.observation?.pathology ?? "none",
      userTemperature: parsed.observation?.userTemperature ?? "unknown",
      openThreads: Array.isArray(parsed.observation?.openThreads)
        ? parsed.observation.openThreads
        : [],
      conversationState: parsed.observation?.conversationState ?? "productive",
      suggestedIntervention: parsed.observation?.suggestedIntervention ?? undefined,
    };

    // Log pathologies when detected
    if (observation.pathology !== "none") {
      console.log(
        `[Conductor] ⚠ Pathology detected: ${observation.pathology} | user: ${observation.userTemperature} | state: ${observation.conversationState}`
      );
    }

    return {
      speakers: validSpeakers,
      observation,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
    };
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
    observation: {
      pathology: "none",
      userTemperature: "unknown",
      openThreads: [],
      conversationState: "productive",
    },
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
