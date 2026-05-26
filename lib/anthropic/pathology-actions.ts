import { ConversationPathology } from "@/lib/anthropic/conductor";
import { CouncilMember } from "@/types/council.types";
import { ConversationEntry } from "@/lib/anthropic/council";

/**
 * Pathology Actions: Map detected conversation pathologies to behavioral interventions.
 *
 * When the conductor detects a pathology, instead of just logging it,
 * we override speaker selection and inject briefings to force improvement.
 *
 * Strategy per pathology:
 * - validation_loop: Force someone to push back (Maya for game theory, Eitan for logic)
 * - abstraction_spiral: Force concretization (Daniel for artifacts, Hana for metrics)
 * - echo_chamber: Force contrast (someone not yet heard, different angle)
 * - topic_drift: Force grounding (Tomás for historical parallel)
 * - sycophancy_creep: Force sharp take (Eitan, no hedging)
 * - user_disengaged: Force direct address (Imani, speak to the person)
 * - stuck_in_circles: Force inversion (challenge the framing itself)
 */

export type PathologyIntervention =
  | "force_challenge"
  | "force_concretize"
  | "force_contrast"
  | "force_ground"
  | "force_sharp"
  | "force_direct"
  | "force_invert";

export interface PathologyAction {
  pathology: ConversationPathology;
  intervention: PathologyIntervention;
  recommendedPersonas: string[];
  briefingTemplate: string;
}

export const PATHOLOGY_INTERVENTIONS: Record<ConversationPathology, PathologyAction> = {
  validation_loop: {
    pathology: "validation_loop",
    intervention: "force_challenge",
    recommendedPersonas: ["maya-krishnan", "eitan-bergmann"],
    briefingTemplate:
      "The room is in agreement. Your job: push back. Name the assumption nobody's challenging. What could be wrong here?",
  },
  abstraction_spiral: {
    pathology: "abstraction_spiral",
    intervention: "force_concretize",
    recommendedPersonas: ["daniel-okafor", "hana-mori"],
    briefingTemplate:
      "This conversation is getting more abstract, not more actionable. Concretize it. What ships? What's the number? What's the decision?",
  },
  echo_chamber: {
    pathology: "echo_chamber",
    intervention: "force_contrast",
    recommendedPersonas: ["rafa-velez", "priya-anand", "imani-wright"],
    briefingTemplate:
      "Same point, different voices. Break the pattern. What's the contrarian take? What's the angle nobody's mentioned?",
  },
  topic_drift: {
    pathology: "topic_drift",
    intervention: "force_ground",
    recommendedPersonas: ["tomas-rivera"],
    briefingTemplate:
      "The conversation has drifted. Ground it in something real: a historical precedent, a pattern you've seen before, a concrete lesson.",
  },
  sycophancy_creep: {
    pathology: "sycophancy_creep",
    intervention: "force_sharp",
    recommendedPersonas: ["eitan-bergmann", "maya-krishnan"],
    briefingTemplate:
      "Everyone is softening their takes. Get sharp. Name the trade-off. Name the risk. No hedging, no 'it depends' — what's the real constraint?",
  },
  user_disengaged: {
    pathology: "user_disengaged",
    intervention: "force_direct",
    recommendedPersonas: ["imani-wright"],
    briefingTemplate:
      "They're checked out. Speak directly to the person, not the room. One sentence to them: what do you actually need to decide right now?",
  },
  stuck_in_circles: {
    pathology: "stuck_in_circles",
    intervention: "force_invert",
    recommendedPersonas: ["eitan-bergmann", "maya-krishnan"],
    briefingTemplate:
      "We've been circling the same ground. Invert the premise. If the opposite were true, what would change? Challenge the framing itself.",
  },
  none: {
    pathology: "none",
    intervention: "force_challenge", // Fallback, shouldn't be used
    recommendedPersonas: [],
    briefingTemplate: "",
  },
};

/**
 * Select the intervention persona based on pathology type and conversation state.
 * Returns the first recommended persona that's available.
 */
export function selectInterventionPersona(
  pathology: ConversationPathology,
  availablePersonas: CouncilMember[],
  recentHistory: ConversationEntry[]
): string | null {
  const action = PATHOLOGY_INTERVENTIONS[pathology];
  if (!action || action.recommendedPersonas.length === 0) {
    return null;
  }

  // Find the first recommended persona that's available
  const availablePersonaIds = new Set(availablePersonas.map((p) => p.personaId));
  const interventionPersona = action.recommendedPersonas.find((pid) =>
    availablePersonaIds.has(pid)
  );

  return interventionPersona || null;
}

/**
 * Get the briefing (instruction) for an intervention.
 * Briefing is injected into the persona's context to guide their response.
 */
export function getBriefingForIntervention(pathology: ConversationPathology): string {
  const action = PATHOLOGY_INTERVENTIONS[pathology];
  if (!action) return "";
  return action.briefingTemplate;
}

/**
 * Get the intent string for conductor decision based on intervention type.
 * Intents are hints that help the conductor select appropriate personas.
 */
export function getIntentForIntervention(
  pathology: ConversationPathology
): "challenge" | "concretize" | "contrast" | "ground" | "sharp" | "direct" | "invert" {
  const action = PATHOLOGY_INTERVENTIONS[pathology];
  if (!action) return "challenge";

  switch (action.intervention) {
    case "force_challenge":
      return "challenge";
    case "force_concretize":
      return "concretize";
    case "force_contrast":
      return "contrast";
    case "force_ground":
      return "ground";
    case "force_sharp":
      return "sharp";
    case "force_direct":
      return "direct";
    case "force_invert":
      return "invert";
    default:
      return "challenge";
  }
}

/**
 * Log a pathology action for debugging and quality tracking.
 */
export function logPathologyAction(
  pathology: ConversationPathology,
  selectedPersonaId: string,
  briefing: string
): void {
  console.log(
    `[Pathology Action] ${pathology} detected → forcing ${selectedPersonaId} with briefing: "${briefing.substring(0, 60)}..."`
  );
}
