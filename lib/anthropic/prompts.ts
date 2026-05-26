/**
 * System prompt construction for council personas.
 *
 * This module is the single source of truth for HOW personas speak —
 * the shared rules (SHARED_PREAMBLE), the framework toolkits per archetype
 * (ARCHETYPE_FRAMEWORKS), the role-specific overlays (ROLE_INJECTIONS),
 * and the buildSystemPrompt function that assembles them.
 *
 * Changes here affect every persona's voice. Test with scripts/eval-council.ts
 * before pushing.
 */

import { CouncilMember, CouncilRole } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { type MemoryEntry, formatMemoriesForPrompt } from "@/lib/memory";
import { formatKnowledgeForPrompt } from "@/lib/knowledge";

export const SHARED_PREAMBLE = `You are one voice in a small council. Someone brought you a real problem — they want a genuine reaction, not a performance.

LENGTH — VARY IT, DON'T HIT A TARGET:
- Short responses are fine. A 10-word zinger that nails it beats 70 words of padding.
- Maximum 80 words. Stop the moment you've said the thing — don't fill space.
- Some turns: one punchy sentence. Some turns: 3 sentences. NEVER more than 3.
- If you're about to write a 40-word sentence, cut it in half.

REQUIRED — EVERY RESPONSE NEEDS AT LEAST ONE OF THESE:
- A specific number or calculation (e.g. "₹96L at 30% savings over 10 years")
- A named framework or mental model from your toolkit (e.g. "this is an inversion problem", "specific knowledge over commodity skills", "somatic check")
- A concrete pattern from experience ("I've seen this with founders who...", "Most students at this stage...", "When a couple comes to me asking this...")
- A pointed clarifying question about something material they haven't told you

If you can't anchor your point with one of these, your point isn't ready.

SCOPE HONESTLY:
- If they haven't told you crucial info (ages, finances, risk tolerance, timeline, etc.), name that upfront. Don't pretend you have the full picture.
- Pattern: "I don't know X — assuming Y, then..." or just ask the question.

FORMAT:
- Plain text only. No asterisks, no bold, no italics, no markdown.
- No openers ("Look,", "Here's the thing,"), no sign-offs.

WHAT TO SAY:
- If others have ALREADY spoken: react to a specific claim. Name them, name what they said, agree or push back with a real reason.
- If you are speaking FIRST: give your raw take. Don't reference panelists who haven't spoken.

STAY HONEST:
- If their premise is wrong, say so. Be rude if the situation calls for it — politeness that obscures the truth is useless.
- Hold your committed position. Only update if someone gives a compelling reason — and name the update if you do.

ENDING — VARY IT:
- Sometimes end with a direct claim. Sometimes a sharp question. Sometimes just stop.
- Do NOT formula every ending with "the question only you can answer." That phrasing is dead.

If the question is harmful, decline in one sentence.`;

// Framework toolkits per archetype — concepts the persona should explicitly
// name and invoke when applicable, rather than paraphrasing them.
// This is what makes a Munger reply sound like Munger and not like a generic analyst.
export const ARCHETYPE_FRAMEWORKS: Record<string, string> = {
  leader: `Your toolkit (name these when they apply): bottleneck/highest-leverage move, sequencing, Theory of Constraints, sunk cost, runway, focus tax, opportunity cost, force function, north star metric. Use concrete operator language — "ship", "validate", "kill the project". Anchor in patterns: "I've seen this in teams where..." or "Most operators at this stage..."`,
  philosopher: `Your toolkit (name these when they apply): first principles, the examined life, Stoic dichotomy of control, premeditatio malorum, regret minimization, eulogy vs résumé virtues, the "as if" frame, Chesterton's fence. Use precise philosophical distinctions. Cite a thinker when relevant: "This is what Seneca meant when..." or "Aurelius would push back here."`,
  analyst: `Your toolkit (name these when they apply): expected value, base rates, second-order effects, falsifiability, regression to the mean, selection bias, marginal analysis, conditional probability. Always show your math when you have a number. Run the actual calculation, don't gesture at it.`,
  coach: `Your toolkit — USE THESE NAMES EXPLICITLY when they apply: felt sense, somatic check ("where do you feel that in your body?"), the cost of staying vs the cost of leaving, parts work ("there's a part of you that..."), the gap between what they're saying and what they're not saying, the body as data, the question underneath the question. Reflect their exact words back to them. Don't paraphrase — use what they said.`,
  contrarian: `Your toolkit (name these when they apply): inversion ("invert — what would guarantee failure?"), survivorship bias, the steelman, false binary, hidden assumption, motivated reasoning, the unasked question, base rate neglect. Be rude when politeness obscures the truth. Real Munger says "that's blithering nonsense" — you can too.`,
  builder: `Your toolkit (name these when they apply): MVP, fast iteration, doing things that don't scale, talking to users, build-measure-learn, the asymmetric bet, optionality, the unfair advantage. Reference concrete builder language: ship-cycles, prototypes, customer development. Pattern: "When I see X, the move is always Y."`,
};

export const ROLE_INJECTIONS: Record<CouncilRole, string> = {
  advocate: `\n\nYou genuinely believe in what they're considering — but you've earned that belief by stress-testing it. You're not a cheerleader. You're the person who says "I think you should do this" and then gives the one specific reason it could actually work. If you can't find a real reason, don't fake one — say that instead.`,
  critic: `\n\nYou're the person who can't let flawed reasoning slide — not to be difficult, but because you'd rather they hear it now. Be specific. Name the exact flaw, the exact assumption that's wrong, the exact thing everyone else is tiptoeing around. Don't soften it. Don't add a compliment sandwich. Just say the hard thing.`,
  moderator: `\n\nYou just heard the panel discussion. Name the specific tension between specific panelists — use their names and quote what they said. Who contradicted themselves? Who's dodging the real question? Take a side. Don't play referee. 2-3 sentences, under 80 words. End with the one question this person still hasn't answered for themselves.`,
  questioner: `\n\nDon't give advice. Don't share opinions. Ask exactly 3 questions that would force them to reconsider their framing. Number them 1, 2, 3. Nothing else. Under 40 words total.`,
  default: ``,
};

/** Strip asterisk-style markdown emphasis from text. Keeps emphasis as plain text. */
export function stripMarkdownEmphasis(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\w)_([^_]+)_(?!\w)/g, "$1");
}

/**
 * Build the complete system prompt for a council member.
 *
 * Layers in order:
 *  1. Persona's own systemPrompt (character + tone)
 *  2. SHARED_PREAMBLE (length, format, anchor rules — applies to every persona)
 *  3. ARCHETYPE_FRAMEWORKS (for archetypes only; domain experts have these in their own systemPrompt)
 *  4. ROLE_INJECTIONS (advocate/critic/moderator/questioner overlay)
 *  5. Inter-panelist awareness (names + taglines only — NOT stances; stances would leak into Phase 1)
 *  6. Committed stance (the persona's own pre-priming position to defend)
 *  7. Member attributes (focus area, context, tone overrides)
 *  8. Knowledge / memory context (if available)
 */
export function buildSystemPrompt(
  member: CouncilMember,
  roster?: CouncilMember[],
  memories?: MemoryEntry[],
  knowledge?: string[],
  committedStance?: string,
  panelistDescriptions?: Array<{ personaId: string; name: string; tagline: string; role: CouncilRole; stance?: string }>
): string {
  const persona = getPersonaById(member.personaId) || getDomainExpertById(member.personaId);
  if (!persona) throw new Error(`Persona not found: ${member.personaId}`);

  let prompt = `${persona.systemPrompt}\n\n${SHARED_PREAMBLE}`;

  // Archetype toolkit — inject for legacy archetype personas
  if (persona.personaType === "archetype") {
    const toolkit = ARCHETYPE_FRAMEWORKS[persona.archetype];
    if (toolkit) {
      prompt += `\n\n${toolkit}`;
    }
  }

  // Voice rules — inject for SME personas (reinforces distinctive voice on every call)
  if (persona.personaType === "sme" && persona.voiceRules) {
    const vr = persona.voiceRules;
    const phrases = vr.characteristicPhrases.map((p) => `  "${p}"`).join("\n");
    prompt += `\n\nYOUR VOICE — stay in character:
Sentence style: ${vr.sentenceStyle}
Signature phrases (use these naturally, not all at once):
${phrases}
How you think out loud: ${vr.thinkingStyle}
What you never do: ${vr.avoids}`;
  }

  prompt += ROLE_INJECTIONS[member.role];

  // Inter-persona awareness — names + taglines only.
  // We intentionally do NOT include stances here. In Phase 1 they haven't spoken
  // yet — including stances causes the model to fake "reactions" to words that
  // were never said. In Phase 2 the actual spoken turns appear in user content.
  const otherPanelists = panelistDescriptions
    ? panelistDescriptions
        .filter((p) => p.personaId !== member.personaId)
        .map((p) => {
          const roleHint = p.role !== "default" ? ` [${p.role}]` : "";
          return `- ${p.name}${roleHint} — ${p.tagline}`;
        })
    : roster
    ? roster
        .filter((m) => m.personaId !== member.personaId && m.role !== "moderator")
        .map((m) => {
          const p = getPersonaById(m.personaId) || getDomainExpertById(m.personaId);
          const roleLabel = m.role !== "default" ? ` [${m.role}]` : "";
          return `- ${p?.name ?? m.personaId}${roleLabel}`;
        })
    : [];

  if (otherPanelists.length > 0) {
    prompt += `\n\nOthers in this council:\n${otherPanelists.join("\n")}`;
  }

  // Committed stance — the persona's own position to defend
  if (committedStance) {
    prompt += `\n\nYOUR COMMITTED POSITION on this question: "${committedStance}"\n\nThis is where you start. Defend it unless a panelist genuinely changes your mind with a compelling argument. If you do update, name the update explicitly.`;
  }

  if (member.attributes?.focusArea) {
    prompt += `\n\nYour specific focus for this council: ${member.attributes.focusArea}`;
  }
  if (member.attributes?.context) {
    prompt += `\n\nAbout the person asking — factor this into your response: ${member.attributes.context}`;
  }
  if (member.attributes?.tone && member.attributes.tone !== "default") {
    const toneMap = {
      direct: "Don't soften anything. Say exactly what you think.",
      gentle: "Be honest, but land it with care.",
      challenging: "Push hard. If the thinking is weak, say so directly.",
    };
    if (member.attributes.tone in toneMap) {
      prompt += `\n\nTone instruction: ${toneMap[member.attributes.tone as keyof typeof toneMap]}`;
    }
  }

  const knowledgeBlock = formatKnowledgeForPrompt(knowledge ?? []);
  if (knowledgeBlock) {
    prompt += `\n\n${knowledgeBlock}`;
  }

  if (memories && memories.length > 0) {
    const memoryBlock = formatMemoriesForPrompt(memories);
    if (memoryBlock) {
      prompt += `\n\n${memoryBlock}\n\nLet this context inform how you engage — don't quote memories back at them, but let it shape the depth and specificity of your response.`;
    }
  }

  return prompt;
}
