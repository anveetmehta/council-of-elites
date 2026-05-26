import { getAnthropicClient } from "./client";
import { CouncilMember, PersonaResponse, CouncilRole, ConversationTurn, DirectorDecision } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { type MemoryEntry } from "@/lib/memory";
import { buildSystemPrompt, stripMarkdownEmphasis } from "./prompts";
import { CALCULATOR_TOOL, CALCULATOR_ENABLED_PERSONAS, runCalculator, formatCalculatorResult } from "@/lib/tools/calculator";
import { WEB_SEARCH_TOOL, WEB_SEARCH_ENABLED_PERSONAS, runWebSearch, formatWebSearchResult } from "@/lib/tools/web-search";
import { selectModel, getMaxTokensForModel, type ModelChoice } from "@/lib/anthropic/model-routing";
import type Anthropic from "@anthropic-ai/sdk";

// Re-export for backward compat — callers import these from "./council" too
export { buildSystemPrompt, stripMarkdownEmphasis } from "./prompts";
export { checkInputSafety } from "./safety";

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

Before hearing anyone else's take, what is your INSTINCTIVE first-order position on this question? One sentence. State it directly — the position you would defend in a debate. No hedging, no "it depends."

Plain text only. No asterisks, no bold, no markdown, no quotation marks for emphasis.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") return "";
    return stripMarkdownEmphasis(content.text.trim().replace(/^["']|["']$/g, ""));
  } catch {
    return "";
  }
}

// ── Scoping: detect vague questions, run a clarification turn ──
//
// Real advisors don't dispense advice on vague questions — they scope first.
// "Should I quit my job?" needs to know: age, runway, what you'd do instead,
// financial obligations. "Help me invest" needs: amount, timeline, risk tolerance.
//
// classifyNeedsScoping uses a cheap Haiku call to decide if the question
// is missing enough material context that the panel should pause and ask.
export async function classifyNeedsScoping(question: string): Promise<boolean> {
  // Heuristic: very short questions almost always need scoping
  const wordCount = question.trim().split(/\s+/).length;
  if (wordCount <= 4) return true;
  // Questions with concrete numbers and details are usually scoped already
  const hasNumbers = /\d/.test(question);
  if (wordCount > 25 && hasNumbers) return false;

  const client = getAnthropicClient();
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: `Question: "${question}"

Could a skilled advisor give a useful answer to this WITHOUT first asking clarifying questions? If they'd need to know critical details (age, finances, situation, timeline, alternatives) that weren't stated, answer NO. If the question is already specific enough to answer, answer YES.

Answer in one word: YES or NO.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") return false;
    return content.text.trim().toUpperCase().startsWith("N");
  } catch {
    return false;
  }
}

// streamScopingTurn — one persona names what's missing, states their working
// assumptions, and signals the panel can now proceed. This sets shared context
// for all subsequent Phase 1 takes.
export async function streamScopingTurn(
  member: CouncilMember,
  question: string,
  onToken: (text: string) => void,
  panelistDescriptions?: Array<{ personaId: string; name: string; tagline: string; role: CouncilRole; stance?: string }>,
  committedStance?: string
): Promise<PersonaResponse> {
  const client = getAnthropicClient();
  const systemPrompt = buildSystemPrompt(
    member,
    undefined,
    undefined,
    undefined,
    committedStance,
    panelistDescriptions
  );

  const userContent = `Someone just asked the panel: "${question}"

But this question is too vague to answer well as-stated. Critical context is missing.

YOUR JOB right now is to scope the conversation BEFORE anyone gives advice:
1. In one sentence, list 2-3 specific pieces of info you'd need to actually answer this (ages, finances, timeline, what they've already tried, etc.).
2. In one sentence, state the working assumptions you're going to use in the meantime so the conversation can move forward.
3. Do NOT give advice yet. That's for the others.

Under 60 words. Plain text. Direct.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 140,
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

  return { response: stripMarkdownEmphasis(fullText), role: member.role };
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

// ── Tool-use path for calculator-enabled personas (Hana, Daniel) ──
// Uses non-streaming messages.create so we can handle multi-turn tool calls,
// then emits the final text as a batch. The "thinking" indicator covers the gap.

async function runPersonaWithTools(
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  onToken: (text: string) => void,
  maxTokens = 300,
  model: ModelChoice = 'claude-sonnet-4-6',
  personaId?: string
): Promise<string> {
  const client = getAnthropicClient();

  // Build tools array based on persona capabilities
  const tools: Anthropic.Tool[] = [CALCULATOR_TOOL];
  if (personaId && WEB_SEARCH_ENABLED_PERSONAS.has(personaId)) {
    tools.push(WEB_SEARCH_TOOL);
  }

  // First call with tools enabled
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    tools,
    tool_choice: { type: "auto" },
  });

  let finalText = "";
  const toolUseBlocks: Anthropic.ToolUseBlock[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      finalText += block.text;
    } else if (block.type === "tool_use") {
      toolUseBlocks.push(block);
    }
  }

  // Handle tool calls — execute and get continuation
  if (toolUseBlocks.length > 0 && response.stop_reason === "tool_use") {
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (tb) => {
        if (tb.name === "calculate") {
          const input = tb.input as { expression: string; label?: string };
          const result = runCalculator(input);
          return {
            type: "tool_result" as const,
            tool_use_id: tb.id,
            content: formatCalculatorResult(result),
          };
        } else if (tb.name === "search_web") {
          const input = tb.input as { query: string; num_results?: number };
          const result = await runWebSearch(input);
          return {
            type: "tool_result" as const,
            tool_use_id: tb.id,
            content: formatWebSearchResult(result),
          };
        } else {
          return {
            type: "tool_result" as const,
            tool_use_id: tb.id,
            content: `Unknown tool: ${tb.name}`,
          };
        }
      })
    );

    // Continue with tool results injected
    const continuation = await client.messages.create({
      model,
      max_tokens: 250,
      system: systemPrompt,
      messages: [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ],
      tools,
      tool_choice: { type: "auto" },
    });

    finalText = "";
    for (const block of continuation.content) {
      if (block.type === "text") finalText += block.text;
    }
  }

  // Emit as tokens (batch — shows after "thinking" state)
  if (finalText) {
    onToken(finalText);
  }

  return finalText;
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

  const modelToUse = selectModel(member.personaId, 'initial');
  const maxTokens = getMaxTokensForModel(modelToUse, 'initial');

  // Tool-enabled personas use the tool-use path (calculator or web search)
  if (CALCULATOR_ENABLED_PERSONAS.has(member.personaId) || WEB_SEARCH_ENABLED_PERSONAS.has(member.personaId)) {
    const fullText = await runPersonaWithTools(
      systemPrompt,
      [{ role: "user", content: userContent }],
      onToken,
      300,
      modelToUse,
      member.personaId
    );
    return { response: stripMarkdownEmphasis(fullText), role: member.role };
  }

  // All other personas: standard streaming
  const stream = client.messages.stream({
    model: modelToUse,
    max_tokens: maxTokens,
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

  return { response: stripMarkdownEmphasis(fullText), role: member.role };
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

  // Detect if the conversation ended with a handoff question to the user.
  // If yes, generate chips that ANSWER it (so the user can click instead of typing).
  const handoffTurn = turns?.find((t) => t.isHandoff);
  const handoffQuestion = handoffTurn?.response.match(/[^.!?]*\?\s*$/)?.[0]?.trim();

  const promptText = handoffQuestion
    ? `The panel just asked the user this specific question: "${handoffQuestion}"

Generate 3 short ANSWER OPTIONS the user might click instead of typing. These should be plausible, specific answers a real person might give — not more questions. Examples of good format: "~₹1.5L take-home, spending 1.2L", "Yes, my spouse is fully on board", "Around 6 months runway saved".

Return ONLY a JSON array of 3 strings, each under 14 words.

Discussion context:
${conversationText}`
    : `Based on this panel discussion about "${question}", suggest 3 short follow-up questions that dig into specific disagreements, tensions, or gaps. Reference at least one advisor by name in 2 of the 3 questions. Return ONLY a JSON array of 3 strings, each under 12 words.\n\nDiscussion:\n${conversationText}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: promptText,
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
  panelistDescriptions?: Array<{ personaId: string; name: string; tagline: string; role: CouncilRole; stance?: string }>,
  isHandoffTurn?: boolean
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

  // Targeted context: enough turns for callbacks AND immediate engagement.
  // Strategy:
  //   - Scoping turn(s) — establish what we're assuming about the situation
  //   - ALL Phase 1 initial takes — these are the positions, used for callbacks
  //   - Last 3 turns — immediate conversational context
  //   - Any turn that mentions this persona by name (direct addressing)
  const myLastTurn = [...allTurns].reverse().find((t) => t.personaId === member.personaId);
  const personaName =
    getPersonaById(member.personaId)?.name ||
    getDomainExpertById(member.personaId)?.name ||
    member.personaId;
  const myFirstName = personaName.replace(/^The\s/, "").split(" ")[0];

  const scopingTurns = allTurns.filter((t) => t.phase === "scoping");
  const initialTurns = allTurns.filter((t) => t.phase === "initial");
  const lastN = allTurns.slice(-3);
  const mentioningMe = allTurns.filter(
    (t) =>
      t.personaId !== member.personaId &&
      (t.response.includes(personaName) || t.response.includes(myFirstName))
  );

  const relevantSet = new Set<number>();
  for (const t of scopingTurns) relevantSet.add(t.turnIndex);
  for (const t of initialTurns) relevantSet.add(t.turnIndex);
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

  if (isHandoffTurn) {
    userContent += `\n\nWhat's been said:\n\n${transcript}\n\n---\nHANDOFF MOMENT — read this carefully:\n${directorInstruction}\n\nDO NOT address other panelists. Speak to the person who asked. Two sentences naming the tension, then ONE specific answerable question to them. The FINAL CHARACTER of your response MUST be a question mark. Under 60 words.`;
  } else {
    userContent += `\n\nWhat's been said:\n\n${transcript}\n\n---\nDirector's note: ${directorInstruction}\n\nReact. Name the specific claim and person you're pushing on. Under 70 words.`;
  }

  const modelToUse = selectModel(member.personaId, 'reaction');
  const maxTokens = getMaxTokensForModel(modelToUse, 'reaction');

  // Tool-enabled personas use the tool-use path (calculator or web search)
  if (CALCULATOR_ENABLED_PERSONAS.has(member.personaId) || WEB_SEARCH_ENABLED_PERSONAS.has(member.personaId)) {
    const fullText = await runPersonaWithTools(
      systemPrompt,
      [{ role: "user", content: userContent }],
      onToken,
      300,
      modelToUse,
      member.personaId
    );
    return { response: stripMarkdownEmphasis(fullText), role: member.role };
  }

  // All other personas: standard streaming
  const stream = client.messages.stream({
    model: modelToUse,
    max_tokens: maxTokens,
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

  return { response: stripMarkdownEmphasis(fullText), role: member.role };
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

