/**
 * Council Conversation Quality Evaluator
 *
 * Runs the council pipeline against several scenarios and prints transcripts
 * for qualitative inspection. No DB, no auth — pure model behavior.
 *
 * Run with: npx tsx --env-file=.env.local scripts/eval-council.ts
 */

import {
  generateAllStances,
  classifyMove,
  callDirector,
  streamPersonaWithHistory,
  streamReactionTurn,
  classifyNeedsScoping,
  streamScopingTurn,
  type ConversationEntry,
  type StanceMap,
} from "../lib/anthropic/council";
import { CouncilMember, ConversationTurn, CouncilRole } from "../types/council.types";
import { getPersonaById } from "../data/personas";
import { getDomainExpertById } from "../data/domain-experts";

const SEPARATOR = "─".repeat(80);

interface Scenario {
  name: string;
  question: string;
  members: CouncilMember[];
  followUp?: string; // Optional second user message to test multi-round callbacks
}

const scenarios: Scenario[] = [
  {
    name: "Wealth Planning (user's actual scenario)",
    question: "a couple planning wealth creation for 10 year with earning of 2 lac a month",
    members: [
      { personaId: "naval-style", role: "default" },
      { personaId: "munger-style", role: "default" },
      { personaId: "sharp-contrarian", role: "critic" },
    ],
  },
  {
    name: "Career — Student",
    question: "I am a student of class 10 and need guidance for further studies",
    members: [
      { personaId: "empathetic-coach", role: "default" },
      { personaId: "strategic-leader", role: "default" },
      { personaId: "creative-builder", role: "default" },
      { personaId: "reflective-philosopher", role: "default" },
    ],
  },
  {
    name: "Business — Bootstrap vs Raise",
    question:
      "I have a SaaS doing $8k MRR growing 15% MoM. Should I bootstrap or raise a seed round to accelerate?",
    members: [
      { personaId: "strategic-leader", role: "advocate" },
      { personaId: "sharp-contrarian", role: "critic" },
      { personaId: "creative-builder", role: "default" },
    ],
  },
  {
    name: "Personal — Quitting Job",
    question:
      "I want to quit my stable corporate job to make pottery full-time. Am I being reckless?",
    members: [
      { personaId: "empathetic-coach", role: "default" },
      { personaId: "sharp-contrarian", role: "critic" },
      { personaId: "reflective-philosopher", role: "default" },
    ],
  },
  {
    name: "Decision — Two Roles",
    question:
      "Two job offers: one at a top-tier AI lab paying $400k, one at an early startup paying $180k + equity. Which?",
    members: [
      { personaId: "strategic-leader", role: "default" },
      { personaId: "sharp-contrarian", role: "default" },
      { personaId: "reflective-philosopher", role: "default" },
    ],
  },
  {
    name: "Multi-Round (callbacks test)",
    question: "I need to decide whether to move my family to a new city for a better job",
    followUp:
      "We have two kids, ages 8 and 11. Spouse can work remote. Pay bump is 35% but cost of living is also 25% higher.",
    members: [
      { personaId: "strategic-leader", role: "default" },
      { personaId: "empathetic-coach", role: "default" },
      { personaId: "sharp-contrarian", role: "critic" },
    ],
  },
];

function getPersona(id: string) {
  return getPersonaById(id) || getDomainExpertById(id);
}

function countSentences(text: string): number {
  // Simple sentence counter
  return (text.match(/[.!?]+(\s|$)/g) ?? []).length;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

function detectAsterisks(text: string): boolean {
  return /\*[^*]+\*/.test(text);
}

function hasSpecificAnchor(text: string): boolean {
  // Concrete numbers, percentages, currencies
  if (/(\d[\d,]*\s*(?:lac|lakh|crore|cr|k|%|percent|million|m|b|years?|year|month|days?|rupees?|rs|₹|\$|€|£|x\b))/i.test(text)) return true;
  // Math expressions, ranges, large numbers
  if (/(\d+\s*[*x×/+\-=]\s*\d+|\d+\s*to\s*\d+|\d+-\d+|\d{3,})/i.test(text)) return true;
  // Bare ages, years, scores in context (e.g. "above 85", "age 11", "30 years", "year 3")
  if (/\b(age|year|score|grade|level|month|week)\s+\d+\b/i.test(text)) return true;
  if (/\b\d+(-|\s+to\s+)\d+(\s+year|\s+month)?-?\s*old/i.test(text)) return true;
  // Written-out numbers in time contexts ("month seven", "year three", "five years")
  if (/\b(month|year|week|day)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i.test(text)) return true;
  if (/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(months?|years?|weeks?|days?)\b/i.test(text)) return true;
  // Named frameworks across all archetypes
  const frameworks = [
    // Universal
    "inversion", "invert", "circle of competence", "lollapalooza", "specific knowledge",
    "permissionless leverage", "first principles", "stoic", "regret minimization",
    "base rate", "expected value", "second-order", "survivorship bias",
    "steelman", "false binary", "moat", "TAM", "MVP", "bottleneck",
    "theory of constraints", "sunk cost", "opportunity cost", "force function",
    "asymmetric bet", "optionality", "build-measure-learn", "prototype",
    "load-bearing", "north star", "growth ceiling",
    // Coach
    "felt sense", "somatic", "in your body", "underneath this question",
    "parts work", "part of you", "cost of staying", "cost of leaving",
    "the body as data", "what their face", "go quiet",
    // Philosopher
    "dichotomy of control", "premeditatio", "eulogy", "résumé virtues", "chesterton",
    "seneca", "aurelius", "epictetus", "examined life",
  ];
  const lower = text.toLowerCase();
  if (frameworks.some((f) => lower.includes(f))) return true;
  // Anecdote / pattern-match phrasing — broader patterns
  const anecdotePatterns = [
    /i've (?:seen|worked|watched|built|been|shipped)/i,
    /most\s+\S+(?:\s+\S+)?\s+(?:i've|i|at|in|who)/i,  // "most 15-year-olds I've worked with"
    /(?:when i (?:see|was|worked|built)|reminds me|in my experience|every time i)/i,
    /every\s+(?:founder|student|couple|person|operator|team|kid)/i,
    /(?:i used to|i learned this|i made this mistake)/i,
  ];
  if (anecdotePatterns.some((p) => p.test(text))) return true;
  // Coach phrasal patterns — "what they're saying vs what they're not saying" type moves
  if (/what\s+(?:they're|you're|she's|he's|your|their)\s+(?:not\s+)?(?:saying|hearing|feeling)/i.test(text)) return true;
  if (/(?:gap between what|what's not being said|the question (?:underneath|under) the question)/i.test(text)) return true;
  return false;
}

function hasScopingMove(text: string): boolean {
  // Phrases that acknowledge missing info or ask clarifying questions
  return /(assuming|don't know|haven't told|need to know|what's your|how old|how much|what is)/i.test(text);
}

function detectArtificialReferences(text: string, allNames: string[]): {
  hasNonExistentRef: boolean;
  hasAnticipatoryRef: boolean;
} {
  // Detect references like "the others are already saying" / "you'd argue" without actual prior context
  const anticipatoryPatterns = [
    /the others are already/i,
    /everyone( else)? is asking/i,
    /you'?d (likely )?(say|argue|push|claim)/i,
    /(others|people) here are/i,
  ];
  return {
    hasNonExistentRef: false, // hard to detect without semantic analysis
    hasAnticipatoryRef: anticipatoryPatterns.some((p) => p.test(text)),
  };
}

async function runScenario(scenario: Scenario): Promise<void> {
  const { name, question, members, followUp } = scenario;
  console.log(`\n${SEPARATOR}`);
  console.log(`SCENARIO: ${name}`);
  console.log(`Question: "${question}"`);
  console.log(`Members: ${members.map((m) => getPersona(m.personaId)?.name ?? m.personaId).join(", ")}`);
  console.log(SEPARATOR);

  // 1. Stance priming
  console.log("\n[Stance Priming]");
  const stances: StanceMap = await generateAllStances(members, question);
  for (const m of members) {
    const p = getPersona(m.personaId);
    const stance = stances[m.personaId];
    console.log(`  ${p?.name}: "${stance}"`);
  }

  // Build panelist descriptions
  const panelistDescriptions = members.map((m) => {
    const p = getPersona(m.personaId);
    return {
      personaId: m.personaId,
      name: p?.name ?? m.personaId,
      tagline: p?.tagline ?? "",
      role: m.role,
      stance: stances[m.personaId],
    };
  });

  const history: ConversationEntry[] = [];
  const turns: ConversationTurn[] = [];
  let turnIndex = 0;

  // 1.5 — Scoping (if question is vague)
  const needsScoping = await classifyNeedsScoping(question);
  console.log(`\n[Scoping Check] needsScoping=${needsScoping}`);

  if (needsScoping) {
    const scoper =
      members.find((m) => m.personaId === "sharp-contrarian") ??
      members.find((m) => m.personaId === "strategic-leader") ??
      members.find((m) => m.role === "critic") ??
      members[0];
    const scoperPersona = getPersona(scoper.personaId);
    if (scoperPersona) {
      console.log(`\n[Phase 0 — Scoping by ${scoperPersona.name}]`);
      process.stdout.write(`  ${scoperPersona.name}: `);
      const result = await streamScopingTurn(
        scoper,
        question,
        (token: string) => {
          process.stdout.write(token);
        },
        panelistDescriptions,
        stances[scoper.personaId]
      );
      turns.push({
        turnIndex: turnIndex++,
        personaId: scoper.personaId,
        role: scoper.role,
        phase: "scoping",
        response: result.response,
      });
      history.push({
        name: scoperPersona.name,
        role: scoper.role,
        response: result.response,
      });
    }
  }

  // 2. Phase 1 — initial takes
  console.log("\n\n[Phase 1 — Initial Takes]");

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    const persona = getPersona(member.personaId);
    if (!persona) continue;

    const isLast = i === members.length - 1;
    let response = "";

    process.stdout.write(`\n  ${persona.name}: `);
    const result = await streamPersonaWithHistory(
      member,
      question,
      history,
      [],
      undefined,
      (token: string) => {
        process.stdout.write(token);
        response += token;
      },
      members,
      undefined,
      undefined,
      stances[member.personaId],
      panelistDescriptions,
      isLast
    );
    response = result.response;

    history.push({ name: persona.name, role: member.role, response });
    turns.push({
      turnIndex: turnIndex++,
      personaId: member.personaId,
      role: member.role,
      phase: "initial",
      response,
    });
  }

  // 3. Phase 2 — reactions (interReactions + 1 handoff)
  console.log("\n\n[Phase 2 — Reactions]");
  const roster = members.map((m) => ({
    personaId: m.personaId,
    name: getPersona(m.personaId)?.name ?? m.personaId,
    role: m.role,
  }));

  // Mirror prod logic: 1-2 inter-advisor turns + 1 handoff turn
  const interReactions = question.length > 120 ? 2 : 1;
  const MAX_REACTIONS = interReactions + 1;
  for (let r = 0; r < MAX_REACTIONS; r++) {
    const isHandoffTurn = r === MAX_REACTIONS - 1;
    const lastTurn = turns[turns.length - 1];
    const lastMoveContext = await classifyMove(lastTurn, roster);

    const decision = await callDirector(
      question,
      roster,
      turns,
      MAX_REACTIONS - r,
      lastMoveContext
    );

    if (!decision.shouldContinue || !decision.nextSpeaker) {
      console.log(`\n  [Director ends conversation]`);
      break;
    }

    const speakerMember = members.find((m) => m.personaId === decision.nextSpeaker);
    const speakerPersona = getPersona(decision.nextSpeaker);
    if (!speakerMember || !speakerPersona) {
      console.log(`\n  [Director picked invalid speaker: ${decision.nextSpeaker}]`);
      break;
    }

    let instruction = decision.instruction;
    if (isHandoffTurn) {
      instruction = `This is the moment to hand the conversation back to the person who asked. Don't address other panelists. Speak directly to them. In 2-3 sentences: name the specific tension the panel surfaced, then ask them ONE concrete question they need to answer before this conversation can move forward. The question must be answerable — not philosophical. End on that question. Do not summarize.`;
    }

    const handoffTag = isHandoffTurn ? " [HANDOFF]" : "";
    console.log(`\n  [Director picks ${speakerPersona.name}${handoffTag}; last move was ${lastMoveContext.moveType}${lastMoveContext.addressedTo ? ` → ${lastMoveContext.addressedTo}` : ""}]`);
    if (!isHandoffTurn) console.log(`  [Director instruction: "${decision.instruction}"]`);
    process.stdout.write(`\n  ${speakerPersona.name}: `);

    let response = "";
    const result = await streamReactionTurn(
      speakerMember,
      question,
      turns,
      instruction,
      members,
      [],
      undefined,
      (token: string) => {
        process.stdout.write(token);
        response += token;
      },
      undefined,
      undefined,
      stances[speakerMember.personaId],
      panelistDescriptions,
      isHandoffTurn
    );
    response = result.response;

    turns.push({
      turnIndex: turnIndex++,
      personaId: speakerMember.personaId,
      role: speakerMember.role,
      phase: "reaction",
      response,
    });
  }

  // 3.5 — Follow-up round (tests callbacks)
  if (followUp) {
    console.log(`\n\n[Follow-Up Round — user replies]`);
    console.log(`  User: "${followUp}"`);
    console.log(`\n[Phase 1' — Initial takes on follow-up]`);

    const followUpHistory: ConversationEntry[] = [];
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      const persona = getPersona(member.personaId);
      if (!persona) continue;

      const isLast = i === members.length - 1;
      process.stdout.write(`\n  ${persona.name}: `);

      // recentRounds: the first round becomes prior context
      const firstRoundResponses = turns.map((t) => {
        const p = getPersona(t.personaId);
        return {
          name: p?.name ?? t.personaId,
          role: t.role,
          response: t.response,
        };
      });
      const result = await streamPersonaWithHistory(
        member,
        followUp,
        followUpHistory,
        [{ question, responses: firstRoundResponses }],
        undefined,
        (token: string) => process.stdout.write(token),
        members,
        undefined,
        undefined,
        undefined, // No new stance — use existing position
        panelistDescriptions,
        isLast
      );

      followUpHistory.push({
        name: persona.name,
        role: member.role,
        response: result.response,
      });
      turns.push({
        turnIndex: turnIndex++,
        personaId: member.personaId,
        role: member.role,
        phase: "initial",
        response: result.response,
      });
    }
  }

  // 4. Evaluation
  console.log(`\n\n[Evaluation]`);
  const names = members.map((m) => getPersona(m.personaId)?.name ?? m.personaId);
  const firstNames = names.map((n) => n.replace(/^The\s/, "").split(" ")[0]);

  for (let idx = 0; idx < turns.length; idx++) {
    const turn = turns[idx];
    const p = getPersona(turn.personaId);
    const sentences = countSentences(turn.response);
    const words = wordCount(turn.response);
    const hasMd = detectAsterisks(turn.response);
    const artRefs = detectArtificialReferences(turn.response, names);
    const namedPeers = firstNames.filter(
      (fn) =>
        fn !== (p?.name ?? "").replace(/^The\s/, "").split(" ")[0] &&
        turn.response.includes(fn)
    );

    // Handoff = the last reaction-phase turn before a new initial-phase turn,
    // OR the very last turn if it's a reaction. Handles multi-round correctly.
    const nextTurn = turns[idx + 1];
    const isHandoff =
      turn.phase === "reaction" &&
      (idx === turns.length - 1 || (nextTurn && nextTurn.phase === "initial"));
    const endsWithQuestion = /\?\s*$/.test(turn.response.trim());
    const hasAnchor = hasSpecificAnchor(turn.response);
    const hasScope = hasScopingMove(turn.response);

    // Callback detection: does this turn reference a turn from 3+ positions ago?
    let hasCallback = false;
    if (idx >= 3 && namedPeers.length > 0) {
      const recentSpeakers = new Set(
        turns.slice(Math.max(0, idx - 2), idx).map((t) => {
          const tp = getPersona(t.personaId);
          return (tp?.name ?? "").replace(/^The\s/, "").split(" ")[0];
        })
      );
      const callbackPeers = namedPeers.filter((n) => !recentSpeakers.has(n));
      if (callbackPeers.length > 0) hasCallback = true;
    }

    const flags: string[] = [];
    if (words > 110) flags.push(`VERBOSE(${words}w)`);  // 110 not 100 — dense content can run a bit over
    if (hasMd) flags.push("MARKDOWN");
    if (artRefs.hasAnticipatoryRef) flags.push("ANTICIPATORY_REF");
    if (turn.phase === "initial" && namedPeers.length > 0 && idx === 0) {
      flags.push("FIRST_SPEAKER_NAMES_PEERS");
    }
    // Handoff checks — only flag if the FINAL question isn't directed at the user.
    // Brief contextual mention of panelists earlier in the handoff is fine.
    if (isHandoff) {
      if (!endsWithQuestion) {
        flags.push("HANDOFF_NO_QUESTION");
      } else {
        // Check the last sentence — is it user-directed (you/your)?
        const lastSentence = turn.response.match(/[^.!?]*\?\s*$/)?.[0] ?? "";
        const userDirected = /\b(you|your)\b/i.test(lastSentence);
        if (!userDirected && namedPeers.length > 0) {
          flags.push("HANDOFF_ADDRESSES_PEERS");
        }
      }
      // Handoffs are questions to the user; they don't need a separate anchor
    } else {
      // Anchor check only applies to non-handoff turns
      // Scoping turns are inherently meta and don't need a number/framework
      if (!hasAnchor && turn.phase !== "scoping") flags.push("NO_ANCHOR");
    }

    const peerNote = namedPeers.length > 0 ? ` [refs: ${namedPeers.join(", ")}]` : "";
    const scopeNote = hasScope ? " 🔍scope" : "";
    const anchorNote = hasAnchor ? " ⚓anchor" : "";
    const callbackNote = hasCallback ? " ↩callback" : "";
    const flagsNote = flags.length > 0 ? ` ⚠ ${flags.join(",")}` : " ✓";
    const handoffTag = isHandoff ? " 🎯HANDOFF" : "";
    const phaseTag = turn.phase === "scoping" ? "S" : turn.phase[0].toUpperCase();

    console.log(
      `  ${phaseTag}${turn.turnIndex} ${p?.name}${handoffTag}: ${sentences}s/${words}w${anchorNote}${scopeNote}${callbackNote}${peerNote}${flagsNote}`
    );
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  for (const scenario of scenarios) {
    try {
      await runScenario(scenario);
    } catch (err) {
      console.error(`\n[ERROR in scenario "${scenario.name}"]:`, err);
    }
  }

  console.log(`\n${SEPARATOR}`);
  console.log("All scenarios complete.");
  console.log(SEPARATOR);
}

main().catch(console.error);
