import { getAnthropicClient } from "./client";
import { CouncilMember, PersonaResponse, CouncilRole, ConversationTurn, DirectorDecision } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";

const SHARED_PREAMBLE = `You are one voice in a small council of advisors having a live conversation. Someone brought you a real problem.

CRITICAL FORMAT RULES — violating these ruins the experience:
- Keep it tight — 40-120 words. Say what you need to say and stop.
- Talk like a sharp person at a dinner table, not a professor at a lectern.
- Lead with your actual take. No "That's a great question" or "Let me think about this."
- No headers, no bullet points, no numbered lists, no paragraph breaks.
- If others have spoken, react to them — agree, push back, add what they missed.
- One insight, stated clearly and memorably. Not three insights stated generically.
- If the question is harmful or unethical, decline in one sentence.`;

const ROLE_INJECTIONS: Record<CouncilRole, string> = {
  advocate: `\n\nYou genuinely believe in what they're considering — not because you're assigned to, but because you've seen this work. You're the person who says "I think you should do this, and here's why I'd bet on it." Acknowledge the hard parts but don't dwell there.`,
  critic: `\n\nYou're the person who can't let flawed reasoning slide — not to be difficult, but because you'd rather they hear it now than find out the hard way. Be specific. Don't soften it. Name the thing everyone else is avoiding.`,
  moderator: `\n\nYou just heard the panel discussion. Name the specific tension between specific panelists — use their names and reference what they said. Who's dodging something? Take a side, don't play referee. 2-3 sentences, under 80 words. Don't summarize — react.`,
  questioner: `\n\nDon't give advice. Don't share opinions. Ask exactly 3 questions that would change how they think about this. Number them 1, 2, 3. Nothing else. Under 40 words total.`,
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

export function buildSystemPrompt(member: CouncilMember, roster?: CouncilMember[]): string {
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
    max_tokens: 150,
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
  roster?: CouncilMember[]
): Promise<PersonaResponse> {
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(member, roster);

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
    max_tokens: 350,
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
  turns?: ConversationTurn[]
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

  const systemPrompt = `${persona.systemPrompt}\n\n${SHARED_PREAMBLE}${ROLE_INJECTIONS.moderator}`;
  const userContent = `Question: "${question}"\n\nThe panel discussion:\n\n${conversationText}\n\nName the specific tension between panelists. Who disagreed and on what? Who's dodging something? Take a side in 2-3 sentences.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
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
- Pick someone who was directly challenged or has a unique counter-perspective to add.
- NOT everyone needs to react. End early if the conversation has reached natural resolution.
- If turnsRemaining is 0 or there's nothing meaningful left to say, set shouldContinue to false.
- The instruction should tell the speaker exactly what to react to (e.g., "Push back on what X said about Y").

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
  onToken: (text: string) => void
): Promise<PersonaResponse> {
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(member, roster);

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
    max_tokens: 250,
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
