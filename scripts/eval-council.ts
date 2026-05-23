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
  const { name, question, members } = scenario;
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

  // 2. Phase 1 — initial takes
  console.log("\n[Phase 1 — Initial Takes]");
  const history: ConversationEntry[] = [];
  const turns: ConversationTurn[] = [];
  let turnIndex = 0;

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

    const isHandoff = idx === turns.length - 1 && turn.phase === "reaction";
    const endsWithQuestion = /\?\s*$/.test(turn.response.trim());

    const flags: string[] = [];
    if (sentences > 4) flags.push(`LONG(${sentences} sentences)`);
    if (sentences < 2) flags.push(`SHORT(${sentences} sentence)`);
    if (words > 100) flags.push(`VERBOSE(${words} words)`);
    if (hasMd) flags.push("MARKDOWN");
    if (artRefs.hasAnticipatoryRef) flags.push("ANTICIPATORY_REF");
    if (turn.phase === "initial" && namedPeers.length > 0 && idx === 0) {
      flags.push("FIRST_SPEAKER_NAMES_PEERS");
    }
    if (isHandoff && namedPeers.length > 0) flags.push("HANDOFF_ADDRESSES_PEERS");
    if (isHandoff && !endsWithQuestion) flags.push("HANDOFF_NO_QUESTION");

    const peerNote = namedPeers.length > 0 ? ` [refs: ${namedPeers.join(", ")}]` : "";
    const flagsNote = flags.length > 0 ? ` ⚠ ${flags.join(", ")}` : " ✓";
    const handoffTag = isHandoff ? " 🎯HANDOFF" : "";

    console.log(
      `  ${turn.phase[0].toUpperCase()}${turn.turnIndex} ${p?.name}${handoffTag}: ${sentences}s/${words}w${peerNote}${flagsNote}`
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
