import { CALCULATOR_ENABLED_PERSONAS } from "@/lib/tools/calculator";
import { WEB_SEARCH_ENABLED_PERSONAS } from "@/lib/tools/web-search";

export type ModelChoice = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6';

/**
 * Per-persona model preference.
 * Sonnet: Complex reasoning (multi-actor games, interpersonal depth, logical chains)
 * Haiku: Pattern matching (tactical playbooks, narrative formulas)
 */
export const PERSONA_MODEL_PREFERENCE: Record<string, ModelChoice> = {
  // Sonnet (complex reasoning)
  'maya-krishnan': 'claude-sonnet-4-6',      // Multi-actor game theory + research
  'daniel-okafor': 'claude-sonnet-4-6',      // Engineering complexity + tools
  'hana-mori': 'claude-sonnet-4-6',          // Financial math + tools
  'eitan-bergmann': 'claude-sonnet-4-6',     // Logical premise chains + research
  'imani-wright': 'claude-sonnet-4-6',       // Interpersonal depth
  'tomas-rivera': 'claude-sonnet-4-6',       // Historical synthesis + research

  // Haiku (pattern matching)
  'rafa-velez': 'claude-haiku-4-5-20251001',   // Tactical pattern playbooks
  'priya-anand': 'claude-haiku-4-5-20251001',  // Narrative beat formulas
};

/**
 * Select the appropriate model for a persona in a given context.
 * Tool-enabled personas always use Sonnet (tools need stronger reasoning).
 * Otherwise respects persona preference, falling back to context-based default.
 */
export function selectModel(
  personaId: string,
  context: 'initial' | 'reaction' | 'summary' = 'initial'
): ModelChoice {
  // Tool-enabled personas always use Sonnet (tools need stronger reasoning)
  if (CALCULATOR_ENABLED_PERSONAS.has(personaId) || WEB_SEARCH_ENABLED_PERSONAS.has(personaId)) {
    return 'claude-sonnet-4-6';
  }

  // Respect persona preference if defined
  const preference = PERSONA_MODEL_PREFERENCE[personaId];
  if (preference) {
    return preference;
  }

  // Default: Sonnet for initial takes (higher reasoning needed), Haiku for summaries
  if (context === 'summary') {
    return 'claude-haiku-4-5-20251001';
  }
  return 'claude-sonnet-4-6';
}

/**
 * Get the max tokens for a given model.
 * Haiku: tighter constraints (faster turnaround)
 * Sonnet: higher limits (for complex reasoning)
 */
export function getMaxTokensForModel(
  model: ModelChoice,
  context: 'initial' | 'reaction' | 'summary' = 'initial'
): number {
  if (model === 'claude-haiku-4-5-20251001') {
    if (context === 'summary') return 100;
    if (context === 'reaction') return 100;
    return 120;
  }

  // Sonnet
  if (context === 'summary') return 150;
  if (context === 'reaction') return 160;
  return 160;
}
