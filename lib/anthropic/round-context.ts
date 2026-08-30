/**
 * Shared per-request context builders used by both /api/council/start and
 * /api/council/next-turn. These are cheap to recompute (persona lookups,
 * in-memory knowledge retrieval, a handful of small DB reads keyed by
 * personaId) so the turn-by-turn engine derives them fresh on every call
 * instead of persisting them into round_state.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { CouncilMember, CouncilRole } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { retrieveKnowledge } from "@/lib/knowledge";
import { fetchPersonaMemories, type MemoryEntry } from "@/lib/memory";
import type { SSEEvent } from "@/types/council.types";

export function encodeSSE(event: SSEEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>;

export function splitMembers(members: CouncilMember[]) {
  return {
    moderators: members.filter((m) => m.role === "moderator"),
    nonModerators: members.filter((m) => m.role !== "moderator"),
  };
}

export function buildRoster(nonModerators: CouncilMember[]) {
  return nonModerators.map((m) => {
    const p = getPersonaById(m.personaId) || getDomainExpertById(m.personaId);
    return { personaId: m.personaId, name: p?.name ?? m.personaId, role: m.role };
  });
}

export function buildPanelistDescriptions(
  members: CouncilMember[],
  stances: Record<string, string>
) {
  return members.map((m) => {
    const p = getPersonaById(m.personaId) || getDomainExpertById(m.personaId);
    return {
      personaId: m.personaId,
      name: p?.name ?? m.personaId,
      tagline: p?.tagline ?? "",
      role: m.role as CouncilRole,
      stance: stances[m.personaId],
    };
  });
}

export async function buildMemoriesAndKnowledge(
  supabase: AnySupabase,
  userId: string,
  members: CouncilMember[],
  question: string
): Promise<{
  memoriesMap: Record<string, MemoryEntry[]>;
  memoryCounts: Record<string, number>;
  knowledgeMap: Record<string, string[]>;
}> {
  const memoriesMap: Record<string, MemoryEntry[]> = {};
  const memoryCounts: Record<string, number> = {};
  await Promise.all(
    members.map(async (member) => {
      const memories = await fetchPersonaMemories(supabase, userId, member.personaId);
      if (memories.length > 0) {
        memoriesMap[member.personaId] = memories;
        memoryCounts[member.personaId] = memories.length;
      }
    })
  );

  const knowledgeMap: Record<string, string[]> = {};
  for (const member of members) {
    const chunks = retrieveKnowledge(member.personaId, question);
    if (chunks.length > 0) {
      knowledgeMap[member.personaId] = chunks;
    }
  }

  return { memoriesMap, memoryCounts, knowledgeMap };
}
