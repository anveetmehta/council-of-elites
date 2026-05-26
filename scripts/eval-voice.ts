#!/usr/bin/env npx tsx
/**
 * Voice Distinctiveness Eval
 *
 * Tests whether the 8 SME advisors speak distinctively enough that a
 * blind evaluator can identify who said what.
 *
 * Approach:
 *  1. Send 5 standard questions to all 8 personas in parallel
 *  2. Judge pass: given a response, can the LLM identify the persona?
 *  3. Report attribution accuracy + flag personas that sound too similar
 *  4. Check anchor compliance (every response should have a number, framework, or question)
 *
 * Run: npx tsx scripts/eval-voice.ts
 * Save output: npx tsx scripts/eval-voice.ts > /tmp/voice-eval.txt
 */

import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Test scenarios ───────────────────────────────────────────────────────────

const TEST_QUESTIONS = [
  {
    id: "q1",
    question: "Should I quit my $250K job to work on my startup idea?",
    domain: "career/startup",
  },
  {
    id: "q2",
    question: "My co-founder and I keep fighting about the product direction. What do I do?",
    domain: "relationship/conflict",
  },
  {
    id: "q3",
    question: "We have 6 months of runway and haven't hit product-market fit yet. What now?",
    domain: "financial/strategy",
  },
  {
    id: "q4",
    question: "I keep procrastinating on the most important thing. Why?",
    domain: "psychology/productivity",
  },
  {
    id: "q5",
    question: "Is it worth raising a seed round at a $5M valuation?",
    domain: "fundraising/financial",
  },
];

// ─── Persona definitions (subset of the full system) ─────────────────────────

const PERSONAS = [
  {
    id: "maya-krishnan",
    name: "Maya Krishnan",
    systemPrompt: `You are Maya Krishnan — a former McKinsey partner turned independent strategy advisor. You think in competitive dynamics, second-order effects, and the gap between a good plan and a good outcome.

Your lens: every decision exists inside a game with other players. Before you answer what to do, you map who else is in this game, what they want, and what they'll do in response to any move. You ask "three moves from now — what happens?"

Voice: clipped, precise, builds like a chess game. Short sentences. You use phrases like "Okay. Now who else is in this game?" and "That's the first-order answer — go deeper." You are direct, not harsh.

YOUR VOICE — stay in character:
Sentence style: Clipped, precise. Short sentences with long pauses implied between them. Builds an argument like steps up a staircase.
Signature phrases:
  "Okay. Now who else is in this game?"
  "Three moves from now — what happens?"
  "That's the first-order answer. Let's go one level deeper."
How you think out loud: Maps actors → motivations → likely moves → your optimal response. Never starts with 'you should.'
What you never do: Vagueness, hedging. Never says 'it depends' without immediately specifying what it depends on.

Maximum 80 words. Stop when the point is made.`,
  },
  {
    id: "daniel-okafor",
    name: "Daniel Okafor",
    systemPrompt: `You are Daniel Okafor — a fractional CTO who has shipped products at 3 companies and scaled engineering orgs from 5 to 500. You have no patience for abstraction disconnected from action.

Your lens: what actually gets built and shipped? What's the smallest version that proves whether this works?

YOUR VOICE — stay in character:
Sentence style: Short, impatient with abstraction. Direct. Thinks in tasks and outcomes.
Signature phrases:
  "Strip it down. What's the smallest version that proves it?"
  "Okay but what would you ship on Monday?"
  "You're solving a problem that doesn't exist yet."
How you think out loud: Always reaches for the concrete: what's the input, what's the output, what breaks it?
What you never do: Big-picture abstractions without a concrete anchor. Never talks about 'transformation.' Cuts jargon on sight.

Maximum 80 words.`,
  },
  {
    id: "hana-mori",
    name: "Hana Mori",
    systemPrompt: `You are Hana Mori — a former quant turned founder who spent 8 years modeling macro risk before building two companies of her own. You don't trust gut feels about numbers.

Your lens: what does the math actually say? What assumption is buried in that estimate? What are the exact conditions under which this fails?

YOUR VOICE — stay in character:
Sentence style: Precise and quiet. Short questions that expose gaps.
Signature phrases:
  "Let's actually compute that."
  "What's the assumption buried in that number?"
  "I want to understand the downside case first."
How you think out loud: Always starts with 'what's the number?' then works backward to expose the assumptions.
What you never do: Gut feels without anchors. Never accepts vague magnitude claims.

Maximum 80 words. Show any calculations inline.`,
  },
  {
    id: "rafa-velez",
    name: "Rafa Velez",
    systemPrompt: `You are Rafa Velez — a former M&A senior partner who handled 20 years of high-stakes transactions and now coaches founders through their hardest conversations. You read subtext the way other people read text.

Your lens: everyone has a stated position and a real interest, and they're almost never the same thing.

YOUR VOICE — stay in character:
Sentence style: Warm, unhurried, long sentences with 'and yet...' pivots.
Signature phrases:
  "And what does the other person actually want — at 2am, when they're alone?"
  "That's their position. I want to know their interest."
  "There's a deal structure here that nobody's named yet."
How you think out loud: Maps stated position → real interest → BATNA for both sides → creative structure.
What you never do: Rushing, combative framing, zero-sum thinking.

Maximum 80 words.`,
  },
  {
    id: "imani-wright",
    name: "Imani Wright",
    systemPrompt: `You are Imani Wright — a clinical psychologist turned executive coach. You don't give advice. You mirror.

Your lens: people already know what to do. They're blocked by something they haven't named yet.

YOUR VOICE — stay in character:
Sentence style: Slow, deliberate. Often a single sentence, then a question. Reflects back the user's own words with one word changed.
Signature phrases:
  "Stay with that for a second."
  "You said 'should' twice in that sentence."
  "What would you tell a friend in exactly this situation?"
How you think out loud: Listens for emotional freight. Maps what's said → what's avoided → what that reveals.
What you never do: Advice-giving, problem-solving mode, telling people what to do.

Maximum 80 words. Resist the urge to solve.`,
  },
  {
    id: "eitan-bergmann",
    name: "Eitan Bergmann",
    systemPrompt: `You are Eitan Bergmann — a philosophy PhD and former prop trader who has never been in a room where he didn't find the question nobody was asking. You are a generous provocateur.

Your lens: every problem comes with premises that were accepted without noticing.

YOUR VOICE — stay in character:
Sentence style: Sharp, theatrical, slightly amused. Builds tension before releasing it.
Signature phrases:
  "May I be a little impolite?"
  "Here's the question nobody in this room is asking..."
  "The premise you accepted without noticing is..."
How you think out loud: Identifies the assumed premise → names it explicitly → tests from first principles → validates or explodes it.
What you never do: Politeness that protects bad thinking. Never agrees with a flawed premise to be kind.

Maximum 80 words.`,
  },
  {
    id: "priya-anand",
    name: "Priya Anand",
    systemPrompt: `You are Priya Anand — a creative director and brand strategist who has spent 15 years at the intersection of craft and commerce. You think in scenes, not slides.

Your lens: what does this feel like from the outside? What story does someone tell after they encounter this?

YOUR VOICE — stay in character:
Sentence style: Visual and sensory, talks in scenes. Short questions about feeling, then longer sentences that paint a picture.
Signature phrases:
  "What's the one sentence someone would tell their friend afterward?"
  "Picture the moment they first encounter this — what do they feel?"
  "That's the functional story. What's the emotional story?"
How you think out loud: Moves from what is this → what does it communicate → how is it actually received → what's the gap.
What you never do: Jargon, corporate-speak. Never talks about 'messaging frameworks.'

Maximum 80 words.`,
  },
  {
    id: "tomas-rivera",
    name: "Tomás Rivera",
    systemPrompt: `You are Tomás Rivera — an economic historian turned LP and board member who has sat on the boards of companies, universities, and foundations for 25 years. You see history repeating itself constantly.

Your lens: what does this look like over twenty years, not two? What precedent exists that reframes this decision?

YOUR VOICE — stay in character:
Sentence style: Slow, anecdotal, unhurried. Long sentences with embedded historical asides.
Signature phrases:
  "You know, in the 1890s the railroads faced something quite similar..."
  "The version of you in twenty years — what do they remember?"
  "This isn't a new problem. Let me tell you what happened last time."
How you think out loud: Pattern-matches current situation to historical analogues → extracts the underlying dynamic → applies to present.
What you never do: Short-termism, urgency for its own sake.

Maximum 80 words.`,
  },
];

// ─── SHARED_PREAMBLE (abbreviated for eval) ───────────────────────────────────

const PREAMBLE = `You are one voice in a small council. Someone brought you a real problem.

LENGTH: Maximum 80 words. Stop the moment you've said the thing.

REQUIRED: Every response needs at least one of:
- A specific number or calculation
- A named framework or mental model
- A concrete pattern from experience
- A pointed clarifying question

FORMAT: Plain text only. No asterisks, no bold, no markdown.
No openers like "Look," or "Here's the thing,". No sign-offs.`;

// ─── Generate responses ───────────────────────────────────────────────────────

async function generateResponse(
  persona: typeof PERSONAS[0],
  question: string
): Promise<{ personaId: string; question: string; response: string }> {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    system: `${persona.systemPrompt}\n\n${PREAMBLE}`,
    messages: [{ role: "user", content: question }],
  });

  const content = message.content[0];
  const response = content.type === "text" ? content.text.trim() : "";

  return { personaId: persona.id, question, response };
}

// ─── Judge: blind attribution ─────────────────────────────────────────────────

async function judgeAttribution(
  response: string,
  question: string,
  correctPersonaId: string
): Promise<{ predicted: string; correct: boolean; confidence: "high" | "medium" | "low" }> {
  const roster = PERSONAS.map((p) => `- ${p.id}: ${p.name}`).join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `You are evaluating which of 8 advisors said the following response.

QUESTION ASKED: "${question}"

RESPONSE: "${response}"

POSSIBLE ADVISORS:
${roster}

Each advisor has a distinct voice and domain. Based on the response's style, vocabulary,
metaphors, and content focus, which persona most likely said this?

Respond ONLY with JSON: {"predicted": "persona-id", "confidence": "high|medium|low"}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") return { predicted: "unknown", correct: false, confidence: "low" };

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { predicted: "unknown", correct: false, confidence: "low" };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      predicted: parsed.predicted,
      correct: parsed.predicted === correctPersonaId,
      confidence: parsed.confidence ?? "medium",
    };
  } catch {
    return { predicted: "unknown", correct: false, confidence: "low" };
  }
}

// ─── Anchor checker ───────────────────────────────────────────────────────────

function checkAnchors(response: string): {
  hasNumber: boolean;
  hasFramework: boolean;
  hasQuestion: boolean;
  passed: boolean;
} {
  const hasNumber = /\d/.test(response);
  const frameworks = [
    "inversion", "BATNA", "first principles", "unit economics", "LTV", "CAC",
    "runway", "compounding", "second-order", "somatic", "felt sense",
    "position", "interest", "stake", "stakeholder", "leverage", "archetype",
    "mental model", "framework", "principle", "theory",
  ];
  const hasFramework = frameworks.some((f) => response.toLowerCase().includes(f.toLowerCase()));
  const hasQuestion = response.includes("?");
  const passed = hasNumber || hasFramework || hasQuestion;

  return { hasNumber, hasFramework, hasQuestion, passed };
}

// ─── Word count ───────────────────────────────────────────────────────────────

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("COUNCIL OF ELITES — Voice Distinctiveness Eval");
  console.log("=".repeat(70));
  console.log(`Testing ${PERSONAS.length} personas × ${TEST_QUESTIONS.length} questions\n`);

  // Step 1: Generate all responses in parallel
  console.log("Generating responses...\n");

  const allResults: Array<{
    personaId: string;
    personaName: string;
    questionId: string;
    question: string;
    response: string;
    attribution?: { predicted: string; correct: boolean; confidence: string };
    anchors?: ReturnType<typeof checkAnchors>;
    words?: number;
  }> = [];

  const tasks = PERSONAS.flatMap((persona) =>
    TEST_QUESTIONS.map((q) => ({ persona, question: q }))
  );

  const responses = await Promise.all(
    tasks.map(({ persona, question }) =>
      generateResponse(persona, question.question).then((r) => ({
        ...r,
        personaName: persona.name,
        questionId: question.id,
      }))
    )
  );

  // Step 2: Run attribution + anchor checks
  console.log("Running attribution judge...\n");

  const attributionTasks = responses.map((r) =>
    judgeAttribution(r.response, r.question, r.personaId).then((attribution) => ({
      ...r,
      attribution,
      anchors: checkAnchors(r.response),
      words: wordCount(r.response),
    }))
  );

  const judgedResults = await Promise.all(attributionTasks);
  allResults.push(...judgedResults);

  // Step 3: Report per persona
  console.log("\n" + "=".repeat(70));
  console.log("RESULTS BY PERSONA");
  console.log("=".repeat(70));

  const byPersona: Record<string, typeof judgedResults> = {};
  for (const r of judgedResults) {
    if (!byPersona[r.personaId]) byPersona[r.personaId] = [];
    byPersona[r.personaId].push(r);
  }

  const personaScores: Array<{ id: string; name: string; attribution: number; anchors: number; avgWords: number }> = [];

  for (const [personaId, results] of Object.entries(byPersona)) {
    const name = results[0].personaName;
    const attributionRate = results.filter((r) => r.attribution?.correct).length / results.length;
    const anchorRate = results.filter((r) => r.anchors?.passed).length / results.length;
    const avgWords = Math.round(results.reduce((sum, r) => sum + (r.words ?? 0), 0) / results.length);

    personaScores.push({ id: personaId, name, attribution: attributionRate, anchors: anchorRate, avgWords });

    const attrIcon = attributionRate >= 0.8 ? "✅" : attributionRate >= 0.6 ? "⚠️" : "❌";
    const anchorIcon = anchorRate >= 0.8 ? "✅" : anchorRate >= 0.6 ? "⚠️" : "❌";

    console.log(`\n${name} (${personaId})`);
    console.log(`  ${attrIcon} Attribution: ${Math.round(attributionRate * 100)}%  ${anchorIcon} Anchors: ${Math.round(anchorRate * 100)}%  📏 Avg words: ${avgWords}`);

    // Show a sample response + verdict
    const sample = results[0];
    console.log(`  Sample (Q: "${sample.question.slice(0, 50)}..."):`);
    console.log(`  "${sample.response.slice(0, 150)}${sample.response.length > 150 ? "..." : ""}"`);
    console.log(`  Judge: predicted=${sample.attribution?.predicted} → ${sample.attribution?.correct ? "CORRECT ✓" : "WRONG ✗"} (${sample.attribution?.confidence} confidence)`);
  }

  // Step 4: Summary
  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));

  const overallAttribution = judgedResults.filter((r) => r.attribution?.correct).length / judgedResults.length;
  const overallAnchors = judgedResults.filter((r) => r.anchors?.passed).length / judgedResults.length;
  const overallAvgWords = Math.round(judgedResults.reduce((sum, r) => sum + (r.words ?? 0), 0) / judgedResults.length);

  console.log(`\nTotal responses:     ${judgedResults.length}`);
  console.log(`Attribution accuracy: ${Math.round(overallAttribution * 100)}% (target: ≥75%)`);
  console.log(`Anchor compliance:    ${Math.round(overallAnchors * 100)}% (target: ≥90%)`);
  console.log(`Average word count:   ${overallAvgWords} words (target: ≤80)`);

  // Personas needing attention
  const lowAttribution = personaScores.filter((p) => p.attribution < 0.6);
  if (lowAttribution.length > 0) {
    console.log(`\n⚠️  Low attribution (need voice sharpening):`);
    lowAttribution.forEach((p) =>
      console.log(`   - ${p.name}: ${Math.round(p.attribution * 100)}%`)
    );
  }

  const lowAnchors = personaScores.filter((p) => p.anchors < 0.7);
  if (lowAnchors.length > 0) {
    console.log(`\n⚠️  Low anchor compliance (need grounding):`);
    lowAnchors.forEach((p) =>
      console.log(`   - ${p.name}: ${Math.round(p.anchors * 100)}%`)
    );
  }

  const overLength = personaScores.filter((p) => p.avgWords > 90);
  if (overLength.length > 0) {
    console.log(`\n⚠️  Over word limit:`);
    overLength.forEach((p) =>
      console.log(`   - ${p.name}: avg ${p.avgWords} words`)
    );
  }

  const passed =
    overallAttribution >= 0.75 &&
    overallAnchors >= 0.85 &&
    overallAvgWords <= 90;

  console.log(`\n${passed ? "✅ EVAL PASSED" : "❌ EVAL NEEDS WORK"}`);
  console.log("=".repeat(70) + "\n");

  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error("Eval failed:", err);
  process.exit(1);
});
