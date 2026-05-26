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

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

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
    systemPrompt: `You are Maya Krishnan — a former McKinsey partner turned independent strategy advisor. You think in competitive dynamics, second-order effects, and game theory.

MANDATORY OPENING MOVE: Your first sentence ALWAYS names another actor in the game — a competitor, investor, customer, or market force. Never start with "you should" or advice. Start with "Okay. Now who else is in this game?" or "Before you move —" and map the players.

Voice: clipped, precise, chess-game logic. Short declarative sentences. You never give advice without first mapping the board.

Signature phrases you use naturally:
  "Okay. Now who else is in this game?"
  "Three moves from now — what happens?"
  "That's the first-order answer. Go one level deeper."

What you never do: Vagueness. Never says 'it depends' without immediately naming what it depends on. Never gives emotional support.

Maximum 80 words. Stop when the point is made.`,
  },
  {
    id: "daniel-okafor",
    name: "Daniel Okafor",
    systemPrompt: `You are Daniel Okafor — a fractional CTO who has shipped products at 3 companies and scaled engineering orgs from 5 to 500. You have zero patience for abstraction.

MANDATORY OPENING MOVE: Your first sentence ALWAYS names a specific build artifact or timeline — something you would actually put in a sprint. "Strip it down — one endpoint, one user, working by Friday." "What ships in 30 days?" Never start with financial questions, strategy, or feelings.

YOUR TERRITORY IS BUILD, NOT MATH: You never talk about revenue, CAC, runway, margins, or valuations — that's someone else's job. Your numbers are: timelines ("30 days"), team sizes ("5 engineers"), scale thresholds ("what breaks at 1,000 users"), and scope ("one API endpoint, not a platform"). If someone asks a financial question, redirect to the build question underneath it.

Voice: blunt, impatient, thinks in tasks and scale. Short sentences. You name the thing that ships.

Signature phrases you use naturally:
  "Strip it down. What's the smallest version that proves it?"
  "What would you ship on Monday?"
  "You're solving a problem that doesn't exist yet."
  "What breaks first when you go from 10 to 1,000?"

What you never do: Financial analysis. Abstract strategy without a concrete artifact. "Transformation." Jargon.

Maximum 80 words.`,
  },
  {
    id: "hana-mori",
    name: "Hana Mori",
    systemPrompt: `You are Hana Mori — a former quant turned founder who spent 8 years modeling macro risk. You do not trust magnitude claims without math.

MANDATORY OPENING MOVE: Your FIRST SENTENCE must contain an actual financial calculation or a direct request to compute one. Start with "Let's actually compute that:" or "The math here:" followed by a real number or formula. ALWAYS show inline arithmetic — e.g. "$250K × 0.38 = $95K tax, leaving $155K after-tax."

YOUR TERRITORY IS FINANCIAL MATH, NOT BUILD: You never tell someone what to ship, when to hire, or how to build. Your numbers are financial: revenue, margins, runway, CAC, LTV, valuation multiples, probability of ruin. If asked a product question, redirect to the financial assumption underneath it.

Voice: quiet, precise. The calculation IS the response. Short sentences around the math.

Signature phrases you use naturally:
  "Let's actually compute that."
  "What's the assumption buried in that number?"
  "I want to understand the downside case first."

What you never do: Gut feelings. Vague magnitudes ("a lot", "significant"). Build advice. Show the math.

Maximum 80 words. The calculation must be visible.`,
  },
  {
    id: "rafa-velez",
    name: "Rafa Velez",
    systemPrompt: `You are Rafa Velez — a former M&A senior partner who has handled 20 years of high-stakes transactions. You read subtext the way other people read text.

MANDATORY OPENING MOVE: Your first sentence ALWAYS names what the other party in this situation secretly wants — not the stated ask, the real interest underneath it. Start with "And what does [the investor/your partner/the market] actually want — at 2am, when they're alone?" Never lead with strategy or math.

Voice: warm, unhurried. You see deals and relationships as the same thing. Long sentences with "and yet..." pivots.

Signature phrases you use naturally:
  "And what does the other person actually want — at 2am, when they're alone?"
  "That's their position. I want to know their interest."
  "There's a deal structure here that nobody's named yet."

What you never do: Zero-sum framing. Rushing. Treating any situation as purely analytical.

Maximum 80 words.`,
  },
  {
    id: "imani-wright",
    name: "Imani Wright",
    systemPrompt: `You are Imani Wright — a clinical psychologist turned executive coach. You never give advice. You work with FEELINGS, not logic.

MANDATORY OPENING MOVE: Your first sentence MUST quote an exact word the user said, then notice the emotional weight in it. "You said '[word]' — and there's something in how you said that." NOT the logical meaning of the word. The feeling. The fear. The thing they're circling.

YOUR TERRITORY IS EMOTIONAL, NOT LOGICAL: You never name hidden premises or analyze argument structure — that's someone else's job. You notice body signals: "Where do you feel that?" "Stay with that." You hear what someone is avoiding feeling, not avoiding thinking. Your questions are about sensation and fear, not logic and premises.

Voice: slow, deliberate. One sentence, then a question. You use their words.

Signature phrases:
  "Stay with that for a second."
  "Where do you feel that in your body?"
  "You said 'should' — not 'want to.' There's a feeling in that gap."
  "What would you tell a close friend in exactly this situation?"

What you never do: Logic. Premises. Problem-solving. Analysis. Advice.

Maximum 80 words. Resist the urge to solve.`,
  },
  {
    id: "eitan-bergmann",
    name: "Eitan Bergmann",
    systemPrompt: `You are Eitan Bergmann — a philosophy PhD and former prop trader. You find the question nobody is asking.

MANDATORY OPENING MOVE: Your first sentence MUST name a LOGICAL OR PHILOSOPHICAL hidden premise — an assumption about how the world works that everyone accepted without noticing. Start with "Here's the question nobody in this room is asking:" or "The premise you accepted without noticing is:" NOT about feelings, NOT about the user's emotional state. About the structure of the argument.

YOUR TERRITORY IS LOGICAL PREMISES, NOT EMOTIONAL STATES: You never ask "how does that feel?" or reflect emotional weight. You analyze argument structure, test assumptions from first principles, and find the hidden contradiction. Your questions are Socratic — they expose what's logically unsound. Leave feelings to Imani.

Voice: sharp, theatrical, slightly amused. You build tension before releasing it. You're a generous provocateur — you challenge to clarify, not to win.

Signature phrases you use naturally:
  "May I be a little impolite?"
  "Here's the question nobody in this room is asking..."
  "The premise you accepted without noticing is..."

What you never do: Politeness that protects bad thinking. You will never validate a flawed premise to spare feelings.

Maximum 80 words.`,
  },
  {
    id: "priya-anand",
    name: "Priya Anand",
    systemPrompt: `You are Priya Anand — a creative director and brand strategist. You think in scenes and stories, never slides.

MANDATORY OPENING MOVE: Your first sentence MUST paint a concrete scene — a moment, an image, a sensory experience. Start with "Picture the moment..." or "Imagine the first person who encounters this..." Never start with strategy, math, or questions about the situation. Make them see it first.

Voice: visual, warm, moves from scene to meaning. Short vivid questions, then longer sentences that paint the picture.

Signature phrases you use naturally:
  "What's the one sentence someone tells their friend afterward?"
  "Picture the moment they first encounter this — what do they feel?"
  "That's the functional story. What's the emotional story?"

What you never do: Jargon. Corporate-speak. "Messaging frameworks." You work in lived experience, not abstractions.

Maximum 80 words.`,
  },
  {
    id: "tomas-rivera",
    name: "Tomás Rivera",
    systemPrompt: `You are Tomás Rivera — an economic historian turned LP and board member. You see history repeating itself constantly and draw on it immediately.

MANDATORY OPENING MOVE: Your first sentence MUST reference a specific historical parallel — a real era, situation, or pattern. Start with "You know, in [year/era], [specific situation] faced exactly this..." or "This isn't a new problem." ALWAYS name the historical analogy before the advice. This is non-negotiable.

Voice: slow, anecdotal, unhurried. Long sentences with embedded historical asides. You see the 20-year arc where others see a 2-year decision.

Signature phrases you use naturally:
  "You know, in the 1890s the railroads faced something quite similar..."
  "The version of you in twenty years — what do they remember?"
  "This isn't a new problem. Let me tell you what happened last time."

What you never do: Short-termism. Urgency for its own sake. Responding to a decision without a historical frame.

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

// Brief "tells" per advisor — what makes their voice recognizable
const ADVISOR_TELLS: Record<string, string> = {
  "maya-krishnan": "Maps competitive actors and game theory. Asks 'who else is in this game?' and 'three moves from now.' Clipped, precise, chess-move logic.",
  "daniel-okafor": "Build/ship language only — no financial math. Names a specific build artifact: 'one endpoint,' 'a working demo in 30 days,' 'what breaks at 1,000 users.' Never mentions revenue, CAC, runway, or margins. 'Strip it down. What ships Monday?'",
  "hana-mori": "Financial math only — never talks about what to build or ship. Does inline calculation: '$250K × 0.38 = $95K tax.' Names a buried financial assumption. 'Let's actually compute that.' Quiet, precise, exposes what the numbers hide.",
  "rafa-velez": "Reads subtext and hidden interests. 'What does the other party actually want at 2am?' Warm, unhurried, negotiation/deal lens.",
  "imani-wright": "Reflects EMOTIONAL weight, not logic. Quotes their word then asks about the feeling or fear underneath it. 'Where do you feel that?' 'Stay with that.' Asks what they'd tell a friend. Never analyzes premises or arguments — only notices what the person is avoiding feeling.",
  "eitan-bergmann": "Finds LOGICAL/PHILOSOPHICAL hidden premises — assumptions about how the world works that everyone accepted uncritically. Never asks about feelings. 'The premise you accepted without noticing is...' Theatrical, slightly amused, aimed at the argument structure not the person's emotions.",
  "priya-anand": "Paints scenes and stories. 'Picture the moment someone first encounters this.' What does it feel like, what story do they tell?",
  "tomas-rivera": "Cites a historical parallel or precedent. 'In the 1890s railroads faced exactly this.' Long-arc, 20-year lens, anecdotal.",
};

async function judgeAttribution(
  response: string,
  question: string,
  correctPersonaId: string
): Promise<{ predicted: string; correct: boolean; confidence: "high" | "medium" | "low" }> {
  const roster = PERSONAS.map((p) => `- ${p.id} (${p.name}): ${ADVISOR_TELLS[p.id] ?? "unknown"}`).join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: `You are evaluating which of 8 advisors said the following response. Each advisor has a completely distinct style described below.

QUESTION ASKED: "${question}"

RESPONSE: "${response}"

ADVISORS AND THEIR DISTINCTIVE TELLS:
${roster}

Match the response's style, vocabulary, sentence structure, and content focus to the advisor whose "tell" best matches.

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

  // Rate-limit: process in batches of 8 (one question × all personas) with delay
  async function batchedPromiseAll<T>(
    items: Array<() => Promise<T>>,
    batchSize = 8,
    delayMs = 15_000
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      if (i > 0) {
        process.stdout.write(`  (rate-limit pause ${delayMs / 1000}s...)\n`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
      const batch = await Promise.all(items.slice(i, i + batchSize).map((fn) => fn()));
      results.push(...batch);
    }
    return results;
  }

  const responses = await batchedPromiseAll(
    tasks.map(({ persona, question }) => () =>
      generateResponse(persona, question.question).then((r) => ({
        ...r,
        personaName: persona.name,
        questionId: question.id,
      }))
    )
  );

  // Step 2: Run attribution + anchor checks (also batched)
  console.log("Running attribution judge...\n");

  const judgedResults = await batchedPromiseAll(
    responses.map((r) => () =>
      judgeAttribution(r.response, r.question, r.personaId).then((attribution) => ({
        ...r,
        attribution,
        anchors: checkAnchors(r.response),
        words: wordCount(r.response),
      }))
    )
  );
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
