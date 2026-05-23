import { getAnthropicClient } from "./client";
import { CouncilMember, PersonaResponse, CouncilRole, ConversationTurn, DirectorDecision } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { type MemoryEntry, formatMemoriesForPrompt } from "@/lib/memory";
import { formatKnowledgeForPrompt } from "@/lib/knowledge";

const SHARED_PREAMBLE = `You are one voice in a small council. Someone brought you a real problem — they want a genuine reaction, not a performance.

HOW TO SPEAK — THESE ARE HARD RULES:
- 3 sentences. That is the limit. Stop after sentence 3, even mid-thought.
- No asterisks, no bold, no italics, no markdown, no special formatting. Plain text only.
- Sound like a sharp person talking, not writing. No openers, no sign-offs.
- If others have ALREADY spoken (their words appear below): react to a specific claim — name them, name what they said, agree or disagree with a real reason. Do not summarize. Do not pivot away. React.
- If you are speaking FIRST and no one else has spoken yet: give your raw take on the question. Don't reference other panelists — they haven't spoken.

Stay honest:
- If their premise is wrong, say so directly. Validation without honesty is useless.
- Hold your position. You have a committed take. Don't abandon it for harmony — only change your mind if someone gives you a genuinely compelling reason, and name it explicitly if you do.
- Your job is clarity, not comfort.

The last sentence must land on the person asking — name the tension they have to resolve, the thing they're avoiding, or the question only they can answer. Don't conclude. Provoke.

If the question is harmful or unethical, decline in one sentence.`;

const ROLE_INJECTIONS: Record<CouncilRole, string> = {
  advocate: `\n\nYou genuinely believe in what they're considering — but you've earned that belief by stress-testing it. You're not a cheerleader. You're the person who says "I think you should do this" and then gives the one specific reason it could actually work. If you can't find a real reason, don't fake one — say that instead.`,
  critic: `\n\nYou're the person who can't let flawed reasoning slide — not to be difficult, but because you'd rather they hear it now. Be specific. Name the exact flaw, the exact assumption that's wrong, the exact thing everyone else is tiptoeing around. Don't soften it. Don't add a compliment sandwich. Just say the hard thing.`,
  moderator: `\n\nYou just heard the panel discussion. Name the specific tension between specific panelists — use their names and quote what they said. Who contradicted themselves? Who's dodging the real question? Take a side. Don't play referee. 2-3 sentences, under 80 words. End with the one question this person still hasn't answered for themselves.`,
  questioner: `\n\nDon't give advice. Don't share opinions. Ask exactly 3 questions that would force them to reconsider their framing. Number them 1, 2, 3. Nothing else. Under 40 words total.`,
  default: ``,
};

export type ConversationEntry = {
  name: string;
  role: CouncilRole;
  response: string;
};

export type PriorRound = {
  question: string;
  responses: Array<{ name: string; role: string; response: string }>;
  summary?: string;
};

export type StanceMap = Record<string, string>;

// ── Stance Priming: invisible Haiku call per persona before Phase 1 ──
// Generates each persona's instinctive first-order position so they have
// a "committed stance" to defend through the conversation.
export async function generateCommittedStance(
  member: CouncilMember,
  question: string
): Promise<string> {
  const persona = getPersonaById(member.personaId) || getDomainExpertById(member.personaId);
  if (!persona) return "";

  const client = getAnthropicClient();
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: `You are ${persona.name}. ${persona.tagline}.

Their description: ${persona.description}

Someone just asked: "${question}"

Before hearing anyone else's take, what is your INSTINCTIVE first-order position on this question? One sentence. State it directly — this is the position you would defend in a debate. No hedging, no "it depends." If your character would lean one way, lean that way.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") return "";
    return content.text.trim().replace(/^["']|["']$/g, "");
  } catch {
    return "";
  }
}

export async function generateAllStances(
  members: CouncilMember[],
  question: string
): Promise<StanceMap> {
  const result: StanceMap = {};
  await Promise.all(
    members.map(async (m) => {
      const stance = await generateCommittedStance(m, question);
      if (stance) result[m.personaId] = stance;
    })
  );
  return result;
}

// ── Move type classification (for director) ──
export type MoveType = "PROPOSAL" | "CHALLENGE" | "QUESTION" | "BUILD" | "BRIDGE" | "CONCESSION" | "REFRAME" | "OBSERVATION";

export async function classifyMove(
  turn: ConversationTurn,
  roster: Array<{ personaId: string; name: string }>
): Promise<{ moveType: MoveType; addressedTo: string | null }> {
  const speakerName =
    roster.find((r) => r.personaId === turn.personaId)?.name ?? turn.personaId;

  const client = getAnthropicClient();
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: `Classify this conversational move from a panel discussion.

${speakerName} said: "${turn.response}"

Other panelists: ${roster.filter((r) => r.personaId !== turn.personaId).map((r) => r.name).join(", ")}

Move types:
- PROPOSAL: stakes a new claim or recommendation
- CHALLENGE: pushes back on a specific prior claim (names someone)
- QUESTION: directly asks another panelist something
- BUILD: extends a prior claim in the same direction
- BRIDGE: connects two opposing positions
- CONCESSION: partial agreement with a pivot
- REFRAME: shifts what the question itself is asking
- OBSERVATION: notes something without demanding response

Also identify the PERSON this is addressed to by name (if any). Use exact panelist names from the list above, or null.

Return ONLY JSON: {"moveType":"...", "addressedTo": "PanelistName" | null}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") return { moveType: "OBSERVATION", addressedTo: null };
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { moveType: "OBSERVATION", addressedTo: null };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      moveType: (parsed.moveType as MoveType) ?? "OBSERVATION",
      addressedTo: typeof parsed.addressedTo === "string" ? parsed.addressedTo : null,
    };
  } catch {
    return { moveType: "OBSERVATION", addressedTo: null };
  }
}

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

  prompt += ROLE_INJECTIONS[member.role];

  // Inter-persona awareness — who's in the room
  // NOTE: We intentionally do NOT show other panelists' stances here.
  // In Phase 1 they haven't spoken yet — stances would cause the model to
  // fake "reactions" to words that were never said.
  // In Phase 2 the actual spoken turns appear in the user message instead.
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

  // Committed stance — the position this persona will defend
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

export async function callPersonaWithHistory(
  member: CouncilMember,
  question: string,
  history: ConversationEntry[],
  recentRounds: PriorRound[] = [],
  conversationSummary?: string
): Promise<PersonaResponse> {
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(member);

  let userContent = question;
  const hasContext = conversationSummary || recentRounds.length > 0;

  if (hasContext) {
    const parts: string[] = ["This is a follow-up in an ongoing conversation."];

    if (conversationSummary) {
      parts.push(`What's been discussed so far:\n${conversationSummary}`);
    }

    if (recentRounds.length > 0) {
      const recentText = recentRounds
        .map(({ question: q, responses, summary }) => {
          const responsesText = responses
            .map(({ name, role, response }) => {
              const roleLabel = role !== "default" ? ` (${role})` : "";
              return `${name}${roleLabel}: ${response}`;
            })
            .join("\n\n");
          const summaryText = summary ? `\nConclusion: ${summary}` : "";
          return `They asked: "${q}"\n\n${responsesText}${summaryText}`;
        })
        .join("\n\n---\n\n");
      parts.push(`Most recent exchange${recentRounds.length > 1 ? "s" : ""}:\n\n${recentText}`);
    }

    parts.push(`---\nNow they're asking a follow-up: ${question}`);
    userContent = parts.join("\n\n");
  }

  if (history.length > 0) {
    const historyText = history
      .map(({ name, role, response }) => {
        const roleLabel = role !== "default" ? ` [${role}]` : "";
        return `${name}${roleLabel} said: "${response}"`;
      })
      .join("\n\n");

    if (hasContext) {
      userContent += `\n\n---\nWhat others have said so far:\n\n${historyText}\n\nReact to what they said — agree, challenge, or build on something specific. Now it's your turn.`;
    } else {
      userContent = `${question}\n\n---\nWhat others have said so far:\n\n${historyText}\n\nReact to what they said — agree, challenge, or build on something specific. Now it's your turn.`;
    }
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 350,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  return {
    response: content.text,
    role: member.role,
  };
}

export async function callPersona(
  member: CouncilMember,
  question: string
): Promise<PersonaResponse> {
  return callPersonaWithHistory(member, question, []);
}

export async function generateAutoSummary(
  question: string,
  responses: Record<string, PersonaResponse>
): Promise<string> {
  const client = getAnthropicClient();

  const conversationText = Object.entries(responses)
    .map(([personaId, { response, role }]) => {
      const p = getPersonaById(personaId) || getDomainExpertById(personaId);
      const roleLabel = role !== "default" ? ` (${role})` : "";
      return `${p?.name ?? personaId}${roleLabel}: ${response}`;
    })
    .join("\n\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You just observed a conversation between advisors about: "${question}"\n\nThe conversation:\n\n${conversationText}\n\nIn under 120 words, tell the person asking: what was the real tension in this room, and the one question they need to sit with. Name where it didn't resolve. Speak directly to them. No bullet points.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return content.text;
}

export async function generateConversationSummary(
  existingSummary: string | null,
  newRound: { question: string; responses: Array<{ name: string; role: string; response: string }>; roundSummary?: string }
): Promise<string> {
  const client = getAnthropicClient();

  const responsesText = newRound.responses
    .map(({ name, role, response }) => {
      const roleLabel = role !== "default" ? ` (${role})` : "";
      return `${name}${roleLabel}: ${response}`;
    })
    .join("\n\n");
  const roundSummaryText = newRound.roundSummary ? `\nConclusion: ${newRound.roundSummary}` : "";

  const priorContext = existingSummary
    ? `Current summary:\n${existingSummary}\n\nNew exchange to incorporate:`
    : `Summarize this exchange:`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `${priorContext}\n\nUser asked: "${newRound.question}"\n\n${responsesText}${roundSummaryText}\n\nProduce a concise running summary (under 150 words) capturing: key facts about the user's situation, what positions the council has taken, key agreements or tensions, and any open questions. Be factual and compressed — don't editorialize.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") return existingSummary ?? "";
  return content.text.trim();
}

export async function generateCouncilTitle(question: string): Promise<string> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 20,
    messages: [
      {
        role: "user",
        content: `Summarize this topic in 5 words or fewer, title-case, no punctuation: "${question}"`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") return question.substring(0, 50);
  return content.text.trim();
}

export async function streamPersonaWithHistory(
  member: CouncilMember,
  question: string,
  history: ConversationEntry[],
  recentRounds: PriorRound[] = [],
  conversationSummary: string | undefined,
  onToken: (text: string) => void,
  roster?: CouncilMember[],
  memories?: MemoryEntry[],
  knowledge?: string[],
  committedStance?: string,
  panelistDescriptions?: Array<{ personaId: string; name: string; tagline: string; role: CouncilRole; stance?: string }>,
  isLastInPhase1?: boolean
): Promise<PersonaResponse> {
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(
    member,
    roster,
    memories,
    knowledge,
    committedStance,
    panelistDescriptions
  );

  let userContent = question;
  const hasContext = conversationSummary || recentRounds.length > 0;

  if (hasContext) {
    const parts: string[] = ["This is a follow-up in an ongoing conversation."];
    if (conversationSummary) {
      parts.push(`What's been discussed so far:\n${conversationSummary}`);
    }
    if (recentRounds.length > 0) {
      const recentText = recentRounds
        .map(({ question: q, responses, summary }) => {
          const responsesText = responses
            .map(({ name, role, response }) => {
              const roleLabel = role !== "default" ? ` [${role}]` : "";
              return `${name}${roleLabel} said: "${response}"`;
            })
            .join("\n\n");
          const summaryText = summary ? `\nConclusion: ${summary}` : "";
          return `They asked: "${q}"\n\n${responsesText}${summaryText}`;
        })
        .join("\n\n---\n\n");
      parts.push(`Most recent exchange${recentRounds.length > 1 ? "s" : ""}:\n\n${recentText}`);
    }
    parts.push(`---\nNow they're asking a follow-up: ${question}`);
    userContent = parts.join("\n\n");
  }

  if (history.length > 0) {
    const historyText = history
      .map(({ name, role, response }) => {
        const roleLabel = role !== "default" ? ` [${role}]` : "";
        return `${name}${roleLabel}: "${response}"`;
      })
      .join("\n\n");

    if (hasContext) {
      userContent += `\n\n---\nWhat's been said so far:\n\n${historyText}\n\nYour turn. React to something specific — don't just give your take in a vacuum.`;
    } else {
      userContent = `${question}\n\n---\nWhat's been said so far:\n\n${historyText}\n\nYour turn. React to something specific — don't just give your take in a vacuum.`;
    }
  }

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 160,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  let fullText = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onToken(event.delta.text);
      fullText += event.delta.text;
    }
  }

  return { response: fullText, role: member.role };
}

export async function streamModerator(
  moderatorMember: CouncilMember,
  question: string,
  otherResponses: Record<string, PersonaResponse>,
  onToken: (text: string) => void,
  turns?: ConversationTurn[],
  memories?: MemoryEntry[],
  knowledge?: string[],
  committedStance?: string,
  panelistDescriptions?: Array<{ personaId: string; name: string; tagline: string; role: CouncilRole; stance?: string }>
): Promise<string> {
  const client = getAnthropicClient();
  const persona =
    getPersonaById(moderatorMember.personaId) ||
    getDomainExpertById(moderatorMember.personaId);
  if (!persona) throw new Error(`Persona not found: ${moderatorMember.personaId}`);

  let conversationText: string;
  if (turns && turns.length > 0) {
    conversationText = turns
      .map((t) => {
        const p = getPersonaById(t.personaId) || getDomainExpertById(t.personaId);
        const roleLabel = t.role !== "default" ? ` [${t.role}]` : "";
        return `${p?.name ?? t.personaId}${roleLabel} said: "${t.response}"`;
      })
      .join("\n\n");
  } else {
    conversationText = Object.entries(otherResponses)
      .map(([personaId, { response, role }]) => {
        const p = getPersonaById(personaId) || getDomainExpertById(personaId);
        const roleLabel = role !== "default" ? ` [${role}]` : "";
        return `${p?.name ?? personaId}${roleLabel} said: "${response}"`;
      })
      .join("\n\n");
  }

  const systemPrompt = buildSystemPrompt(
    moderatorMember,
    undefined,
    memories,
    knowledge,
    committedStance,
    panelistDescriptions
  );
  const userContent = `Question: "${question}"\n\nThe panel discussion:\n\n${conversationText}\n\nName the specific tension between panelists. Who disagreed and on what? Who's dodging something? Take a side in 2-3 sentences. Don't tie a neat bow — name what didn't resolve.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 220,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  let fullText = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onToken(event.delta.text);
      fullText += event.delta.text;
    }
  }

  return fullText;
}

export async function generateFollowUpChips(
  question: string,
  responses: Record<string, PersonaResponse>,
  turns?: ConversationTurn[]
): Promise<string[]> {
  const client = getAnthropicClient();

  let conversationText: string;
  if (turns && turns.length > 0) {
    conversationText = turns
      .map((t) => {
        const p = getPersonaById(t.personaId) || getDomainExpertById(t.personaId);
        const roleLabel = t.role !== "default" ? ` [${t.role}]` : "";
        return `${p?.name ?? t.personaId}${roleLabel} said: "${t.response}"`;
      })
      .join("\n\n");
  } else {
    conversationText = Object.entries(responses)
      .map(([personaId, { response, role }]) => {
        const p = getPersonaById(personaId) || getDomainExpertById(personaId);
        const roleLabel = role !== "default" ? ` [${role}]` : "";
        return `${p?.name ?? personaId}${roleLabel} said: "${response}"`;
      })
      .join("\n\n");
  }

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Based on this panel discussion about "${question}", suggest 3 short follow-up questions that dig into specific disagreements, tensions, or gaps. Reference at least one advisor by name in 2 of the 3 questions. Make them feel like they came from this conversation, not a generic list. Return ONLY a JSON array of 3 strings, each under 12 words.\n\nDiscussion:\n${conversationText}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") return [];

    const text = content.text.trim();
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.slice(0, 3).map(String);
    } catch {
      const matches = text.match(/"([^"]+)"/g);
      if (matches) return matches.slice(0, 3).map((s) => s.replace(/"/g, ""));
    }
    return [];
  } catch {
    return [];
  }
}

// ── AI Director with Move Awareness ──

export async function callDirector(
  question: string,
  roster: Array<{ personaId: string; name: string; role: CouncilRole }>,
  turnsSoFar: ConversationTurn[],
  turnsRemaining: number,
  lastMoveContext?: { moveType: MoveType; addressedTo: string | null }
): Promise<DirectorDecision> {
  const client = getAnthropicClient();

  const rosterText = roster
    .map((r) => {
      const roleLabel = r.role !== "default" ? ` (${r.role})` : "";
      return `- ${r.name}${roleLabel} [id: ${r.personaId}]`;
    })
    .join("\n");

  const turnsSummary = turnsSoFar
    .map((t) => {
      const name = roster.find((r) => r.personaId === t.personaId)?.name ?? t.personaId;
      const roleLabel = t.role !== "default" ? ` [${t.role}]` : "";
      return `Turn ${t.turnIndex} (${t.phase}): ${name}${roleLabel} said: "${t.response}"`;
    })
    .join("\n\n");

  const reactionCounts: Record<string, number> = {};
  for (const t of turnsSoFar.filter((t) => t.phase === "reaction")) {
    reactionCounts[t.personaId] = (reactionCounts[t.personaId] ?? 0) + 1;
  }
  const eligibleRoster = roster.filter(
    (r) => (reactionCounts[r.personaId] ?? 0) < 2
  );

  const eligibleText = eligibleRoster.map((r) => r.personaId).join(", ");

  const moveContextBlock = lastMoveContext
    ? `\n\nThe last turn was classified as: ${lastMoveContext.moveType}${lastMoveContext.addressedTo ? `, addressed to ${lastMoveContext.addressedTo}` : ""}.

Conditional relevance rules:
- After a CHALLENGE addressed to a named panelist → that panelist responds (highest priority)
- After a QUESTION addressed to a named panelist → that panelist responds
- After a PROPOSAL → whoever has the strongest opposing view responds
- After a BUILD or BRIDGE → anyone with a fresh angle responds
- After a CONCESSION → original challenger acknowledges or extends
- After a REFRAME → anyone willing to engage the new frame responds`
    : "";

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are an invisible conversation director for a panel discussion. Decide who speaks next to create the most engaging exchange.

PANELISTS:
${rosterText}

QUESTION: "${question}"

CONVERSATION SO FAR:
${turnsSummary}

ELIGIBLE TO REACT (max 2 reactions each): ${eligibleText}
REACTION TURNS REMAINING: ${turnsRemaining}${moveContextBlock}

Rules:
- Honor conditional relevance first — if someone was directly named, they should respond.
- Prefer to continue. Only set shouldContinue=false if turnsRemaining is 0, eligible list is empty, or last 2+ turns are clearly repetitive.
- The instruction should be SPECIFIC: name what claim to react to and from whom.

Return ONLY valid JSON:
{"nextSpeaker": "<personaId>", "instruction": "<what to react to, 1 sentence>", "shouldContinue": true/false}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return { nextSpeaker: "", instruction: "", shouldContinue: false };
    }

    const text = content.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { nextSpeaker: "", instruction: "", shouldContinue: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      nextSpeaker: typeof parsed.nextSpeaker === "string" ? parsed.nextSpeaker : "",
      instruction: typeof parsed.instruction === "string" ? parsed.instruction : "",
      shouldContinue: !!parsed.shouldContinue,
    };
  } catch {
    return { nextSpeaker: "", instruction: "", shouldContinue: false };
  }
}

// ── Reaction Turn with targeted context windows ──

export async function streamReactionTurn(
  member: CouncilMember,
  question: string,
  allTurns: ConversationTurn[],
  directorInstruction: string,
  roster: CouncilMember[],
  recentRounds: PriorRound[],
  conversationSummary: string | undefined,
  onToken: (text: string) => void,
  memories?: MemoryEntry[],
  knowledge?: string[],
  committedStance?: string,
  panelistDescriptions?: Array<{ personaId: string; name: string; tagline: string; role: CouncilRole; stance?: string }>
): Promise<PersonaResponse> {
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(
    member,
    roster,
    memories,
    knowledge,
    committedStance,
    panelistDescriptions
  );

  // Targeted context: only include the most relevant turns, not the full transcript
  // Strategy:
  //   - This persona's own most recent turn (so they remember what they said)
  //   - The last 2 turns (immediate conversational context)
  //   - Any turn that mentions this persona by name (someone addressing them)
  const myLastTurn = [...allTurns].reverse().find((t) => t.personaId === member.personaId);
  const personaName =
    getPersonaById(member.personaId)?.name ||
    getDomainExpertById(member.personaId)?.name ||
    member.personaId;
  const myFirstName = personaName.replace(/^The\s/, "").split(" ")[0];

  const lastN = allTurns.slice(-3);
  const mentioningMe = allTurns.filter(
    (t) =>
      t.personaId !== member.personaId &&
      (t.response.includes(personaName) || t.response.includes(myFirstName))
  );

  const relevantSet = new Set<number>();
  if (myLastTurn) relevantSet.add(myLastTurn.turnIndex);
  for (const t of lastN) relevantSet.add(t.turnIndex);
  for (const t of mentioningMe) relevantSet.add(t.turnIndex);

  const relevantTurns = allTurns
    .filter((t) => relevantSet.has(t.turnIndex))
    .sort((a, b) => a.turnIndex - b.turnIndex);

  const transcript = relevantTurns
    .map((t) => {
      const p = getPersonaById(t.personaId) || getDomainExpertById(t.personaId);
      const roleLabel = t.role !== "default" ? ` [${t.role}]` : "";
      const isMe = t.personaId === member.personaId;
      const prefix = isMe ? `YOU (${p?.name ?? t.personaId})${roleLabel} said earlier` : `${p?.name ?? t.personaId}${roleLabel} said`;
      return `${prefix}: "${t.response}"`;
    })
    .join("\n\n");

  let userContent = "";

  const hasContext = conversationSummary || recentRounds.length > 0;
  if (hasContext) {
    const parts: string[] = ["This is a follow-up in an ongoing conversation."];
    if (conversationSummary) {
      parts.push(`What's been discussed so far:\n${conversationSummary}`);
    }
    if (recentRounds.length > 0) {
      const recentText = recentRounds
        .map(({ question: q, responses, summary }) => {
          const responsesText = responses
            .map(({ name, role, response }) => {
              const roleLabel = role !== "default" ? ` [${role}]` : "";
              return `${name}${roleLabel} said: "${response}"`;
            })
            .join("\n\n");
          const summaryText = summary ? `\nConclusion: ${summary}` : "";
          return `They asked: "${q}"\n\n${responsesText}${summaryText}`;
        })
        .join("\n\n---\n\n");
      parts.push(`Most recent exchange${recentRounds.length > 1 ? "s" : ""}:\n\n${recentText}`);
    }
    parts.push(`---\nNow they're asking: ${question}`);
    userContent = parts.join("\n\n");
  } else {
    userContent = `Question: "${question}"`;
  }

  userContent += `\n\nWhat's been said:\n\n${transcript}\n\n---\nDirector's note: ${directorInstruction}\n\nReact. Name the specific claim and person you're pushing on. 3 sentences.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 160,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  let fullText = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onToken(event.delta.text);
      fullText += event.delta.text;
    }
  }

  return { response: fullText, role: member.role };
}

// ── Session Artifact ──

export async function generateSessionArtifact(
  question: string,
  turns: ConversationTurn[],
  moderatorOutput: string | null,
  autoSummary: string | null
): Promise<{ cameInWith: string; walkingOutWith: string; keyDecision: string }> {
  const client = getAnthropicClient();

  const transcript = turns
    .map((t) => {
      const p = getPersonaById(t.personaId) || getDomainExpertById(t.personaId);
      return `${p?.name ?? t.personaId}: "${t.response}"`;
    })
    .join("\n\n");

  const conclusion = moderatorOutput || autoSummary || "";

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Someone came into a council session with this question: "${question}"

The conversation that followed:
${transcript}
${conclusion ? `\nConclusion: ${conclusion}` : ""}

Produce a session artifact in JSON. Be concrete, personal, speak directly to them using "you":
{
  "cameInWith": "One sentence — the specific assumption, question, or belief they arrived with",
  "walkingOutWith": "One sentence — the core insight, reframe, or clarity from this conversation",
  "keyDecision": "One sentence — the specific decision or question only they can now answer"
}

Return ONLY valid JSON. No extra text.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return {
      cameInWith: question,
      walkingOutWith: "The council has weighed in — the next move is yours.",
      keyDecision: "What will you actually do with this?",
    };
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      cameInWith: String(parsed.cameInWith ?? question),
      walkingOutWith: String(parsed.walkingOutWith ?? "The council has weighed in — the next move is yours."),
      keyDecision: String(parsed.keyDecision ?? "What will you actually do with this?"),
    };
  } catch {
    return {
      cameInWith: question,
      walkingOutWith: "The council has weighed in — the next move is yours.",
      keyDecision: "What will you actually do with this?",
    };
  }
}

export async function checkInputSafety(question: string): Promise<boolean> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 5,
    messages: [
      {
        role: "user",
        content: `Does the following question ask for anything harmful, dangerous, illegal, or clearly unethical? Answer only YES or NO.\n\nQuestion: "${question}"`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") return true;
  return !content.text.trim().toUpperCase().startsWith("YES");
}
