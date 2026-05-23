import { getAnthropicClient } from "./client";
import { CouncilMember, PersonaResponse, CouncilRole, ConversationTurn, DirectorDecision } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { type MemoryEntry, formatMemoriesForPrompt } from "@/lib/memory";
import { formatKnowledgeForPrompt } from "@/lib/knowledge";

const SHARED_PREAMBLE = `You are one voice in a small council. Someone brought you a real problem — they want a genuine reaction, not a performance.

How to speak:
- 2–4 sentences. One sharp, specific take. Know when to stop.
- Sound like a smart person at dinner, not a TED talk. No openers like "Great question" or "Interesting point" — just say the thing.
- No headers, bullet points, numbered lists, or paragraph breaks. Pure prose.
- If others have spoken: react to them specifically. Name them, name what they said, and either build on it with a reason or push back hard. Don't just pivot to your own take.

Don't be sycophantic:
- If their premise is wrong or incomplete, say so. Validation without honesty is useless.
- Disagree with other panelists when you actually disagree. Artificial consensus is worse than silence.
- Your job is clarity, not comfort.

End by landing it:
- Your last sentence goes back to the person asking. Name the specific tension they have to resolve, the decision only they can make, or the one thing they're avoiding. Don't conclude — provoke.

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

export function buildSystemPrompt(
  member: CouncilMember,
  roster?: CouncilMember[],
  memories?: MemoryEntry[],
  knowledge?: string[]
): string {
  const persona = getPersonaById(member.personaId) || getDomainExpertById(member.personaId);
  if (!persona) throw new Error(`Persona not found: ${member.personaId}`);

  let prompt = `${persona.systemPrompt}\n\n${SHARED_PREAMBLE}`;

  prompt += ROLE_INJECTIONS[member.role];

  // Roster awareness — tell persona who else is on the panel
  if (roster && roster.length > 1) {
    const otherPanelists = roster
      .filter((m) => m.personaId !== member.personaId && m.role !== "moderator")
      .map((m) => {
        const p = getPersonaById(m.personaId) || getDomainExpertById(m.personaId);
        const roleLabel = m.role !== "default" ? ` (${m.role})` : "";
        return `${p?.name ?? m.personaId}${roleLabel}`;
      });
    if (otherPanelists.length > 0) {
      prompt += `\n\nYou're on a panel with: ${otherPanelists.join(", ")}. Address them by name when reacting to what they said.`;
    }
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

  // Knowledge injection — grounded frameworks for this persona, retrieved per question
  const knowledgeBlock = formatKnowledgeForPrompt(knowledge ?? []);
  if (knowledgeBlock) {
    prompt += `\n\n${knowledgeBlock}`;
  }

  // Memory injection — what this persona knows about the user from past sessions
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

  // Inject within-question history (other personas who've already spoken this round)
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

export async function callModerator(
  moderatorMember: CouncilMember,
  question: string,
  otherResponses: Record<string, PersonaResponse>
): Promise<string> {
  const client = getAnthropicClient();
  const persona =
    getPersonaById(moderatorMember.personaId) ||
    getDomainExpertById(moderatorMember.personaId);
  if (!persona) throw new Error(`Persona not found: ${moderatorMember.personaId}`);

  const conversationText = Object.entries(otherResponses)
    .map(([personaId, { response, role }]) => {
      const p = getPersonaById(personaId) || getDomainExpertById(personaId);
      const roleLabel = role !== "default" ? ` [${role}]` : "";
      return `${p?.name ?? personaId}${roleLabel} said: "${response}"`;
    })
    .join("\n\n");

  const systemPrompt = `${persona.systemPrompt}\n\n${SHARED_PREAMBLE}${ROLE_INJECTIONS.moderator}`;

  const userContent = `Question: "${question}"\n\nThe panel discussion:\n\n${conversationText}\n\nName the specific tension between panelists. Who disagreed and on what? Take a side in 2-3 sentences.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return content.text;
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
        content: `You just observed a conversation between advisors about: "${question}"\n\nThe conversation:\n\n${conversationText}\n\nIn under 120 words, tell the person asking: what was the real tension in this room, and the one question they need to sit with. Speak directly to them. No bullet points.`,
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

/**
 * Stream a persona's introduction (used during intro phase)
 * Each persona gives a brief self-introduction
 */
export async function streamPersonaIntroduction(
  member: CouncilMember,
  onToken: (text: string) => void
): Promise<PersonaResponse> {
  const persona = getPersonaById(member.personaId) || getDomainExpertById(member.personaId);
  if (!persona) throw new Error(`Persona not found: ${member.personaId}`);

  // Use the persona's introduction field directly
  const introductionText = persona.introduction ||
    `I'm ${persona.name}. ${persona.tagline}. I'm here to bring my perspective to the conversation.`;

  const client = getAnthropicClient();
  const systemPrompt = `You are introducing yourself briefly and warmly to a council meeting. You're about to have a conversation with others. Keep it personal and genuine — 20-40 words. Just say who you are, why you're here, and what you bring.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 80,
    system: systemPrompt,
    messages: [{
      role: "user",
      content: `Introduce yourself warmly, briefly, like you're meeting a small group: "${introductionText}"`
    }],
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

export async function streamPersonaWithHistory(
  member: CouncilMember,
  question: string,
  history: ConversationEntry[],
  recentRounds: PriorRound[] = [],
  conversationSummary: string | undefined,
  onToken: (text: string) => void,
  roster?: CouncilMember[],
  memories?: MemoryEntry[],
  knowledge?: string[]
): Promise<PersonaResponse> {
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(member, roster, memories, knowledge);

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
        return `${name}${roleLabel} said: "${response}"`;
      })
      .join("\n\n");

    if (hasContext) {
      userContent += `\n\n---\nWhat others have said so far:\n\n${historyText}\n\nReact to what they said — agree, challenge, or build on something specific. Now it's your turn.`;
    } else {
      userContent = `${question}\n\n---\nWhat others have said so far:\n\n${historyText}\n\nReact to what they said — agree, challenge, or build on something specific. Now it's your turn.`;
    }
  }

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
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
  knowledge?: string[]
): Promise<string> {
  const client = getAnthropicClient();
  const persona =
    getPersonaById(moderatorMember.personaId) ||
    getDomainExpertById(moderatorMember.personaId);
  if (!persona) throw new Error(`Persona not found: ${moderatorMember.personaId}`);

  // Use turns transcript if available, otherwise fall back to flat responses
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

  const memoryBlock = memories && memories.length > 0 ? formatMemoriesForPrompt(memories) : "";
  const knowledgeBlock = formatKnowledgeForPrompt(knowledge ?? []);
  const systemPrompt = `${persona.systemPrompt}\n\n${SHARED_PREAMBLE}${ROLE_INJECTIONS.moderator}${knowledgeBlock ? `\n\n${knowledgeBlock}` : ""}${memoryBlock ? `\n\n${memoryBlock}\n\nLet this context inform how you engage — don't quote memories back at them, but let it shape the depth and specificity of your response.` : ""}`;
  const userContent = `Question: "${question}"\n\nThe panel discussion:\n\n${conversationText}\n\nName the specific tension between panelists. Who disagreed and on what? Who's dodging something? Take a side in 2-3 sentences.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
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

  // Use turns transcript if available
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

    // Try JSON parse first
    const text = content.text.trim();
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.slice(0, 3).map(String);
    } catch {
      // Regex fallback: extract quoted strings
      const matches = text.match(/"([^"]+)"/g);
      if (matches) return matches.slice(0, 3).map((s) => s.replace(/"/g, ""));
    }
    return [];
  } catch {
    return [];
  }
}

// ── AI Director: decides who speaks next in reaction phase ──

export async function callDirector(
  question: string,
  roster: Array<{ personaId: string; name: string; role: CouncilRole }>,
  turnsSoFar: ConversationTurn[],
  turnsRemaining: number
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

  // Track reaction counts per persona
  const reactionCounts: Record<string, number> = {};
  for (const t of turnsSoFar.filter((t) => t.phase === "reaction")) {
    reactionCounts[t.personaId] = (reactionCounts[t.personaId] ?? 0) + 1;
  }
  const eligibleRoster = roster.filter(
    (r) => (reactionCounts[r.personaId] ?? 0) < 2
  );

  const eligibleText = eligibleRoster
    .map((r) => r.personaId)
    .join(", ");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are an invisible conversation director for a panel discussion. Decide who should speak next to create the most engaging exchange.

PANELISTS:
${rosterText}

QUESTION: "${question}"

CONVERSATION SO FAR:
${turnsSummary}

ELIGIBLE TO REACT (max 2 reactions each): ${eligibleText}
REACTION TURNS REMAINING: ${turnsRemaining}

Rules:
- Pick the person who has the strongest counter-perspective or was most directly challenged.
- Prefer to continue unless: (a) turnsRemaining is 0, (b) the eligible list is empty, or (c) the last 2+ turns were genuinely repetitive. Disagreement and tension are features, not reasons to stop.
- The instruction should be specific: name exactly what to react to (e.g., "Push back on X's claim that Y is the main risk").

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

// ── Reaction Turn: persona reacts to the conversation with director guidance ──

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
  knowledge?: string[]
): Promise<PersonaResponse> {
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(member, roster, memories, knowledge);

  // Build conversation transcript from turns
  const transcript = allTurns
    .map((t) => {
      const p = getPersonaById(t.personaId) || getDomainExpertById(t.personaId);
      const roleLabel = t.role !== "default" ? ` [${t.role}]` : "";
      return `${p?.name ?? t.personaId}${roleLabel} said: "${t.response}"`;
    })
    .join("\n\n");

  let userContent = "";

  // Add cross-round context if this is a follow-up conversation
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

  userContent += `\n\nThe panel discussion so far:\n\n${transcript}\n\n---\n${directorInstruction}\nNow respond.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 180,
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

// ── Session Artifact: what the user came in with vs. what they're leaving with ──

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
