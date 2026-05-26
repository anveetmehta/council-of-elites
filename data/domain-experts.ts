/**
 * DEPRECATED — Domain Expert personas have been retired.
 *
 * The roster has been replaced with 8 fictional SME advisors in data/personas.ts.
 * These exports are kept as empty stubs so existing imports don't break.
 */
import { PersonaDefinition } from "@/types/persona.types";
import { getPersonaById } from "@/data/personas";

export const DOMAIN_EXPERT_PERSONAS: PersonaDefinition[] = [];

export function getDomainExpertById(id: string): PersonaDefinition | undefined {
  // Fall back to the new SME roster so old IDs resolve gracefully
  return getPersonaById(id);
}

export function getAllDomainExperts(): PersonaDefinition[] {
  return [];
}
