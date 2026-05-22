import { getAnthropicClient } from "@/lib/anthropic/client";
import { ConversationTurn } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any>;

export interface MemoryEntry {
  id: string;
  personaId: string;
  content: string;
  importance: number;
  memoryType: "observation" | "reflection";
  createdAt: string;
}

/**
 * Fetch the top memories for a persona about a specific user.
 * Reflections are fetched first (they're higher importance + synthesized),
 * then recent observations fill the rest of the limit.
 */
export async function fetchPersonaMemories(
  supabase: AnySupabase,
  userId: string,
  personaId: string,
  limit = 8
): Promise<MemoryEntry[]> {
  const { data } = await supabase
    .from("memory_entries")
    .select("id, persona_id, content, importance, memory_type, created_at")
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  return data.map(
    (row: {
      id: string;
      persona_id: string;
      content: string;
      importance: number;
      memory_type: string;
      created_at: string;
    }) => ({
      id: row.id,
      personaId: row.persona_id,
      content: row.content,
      importance: row.importance,
      memoryType: row.memory_type as "observation" | "reflection",
      createdAt: row.created_at,
    })
  );
}

/**
 * Extract 2–3 memory observations for a persona from a completed conversation round.
 * Runs after the stream closes — does not block the user.
 */
export async function extractMemoryEntries(
  personaId: string,
  question: string,
  personaResponse: string,
  allTurns: ConversationTurn[]
): Promise<Array<{ content: string; importance: number }>> {
  const client = getAnthropicClient();
  const persona = getPersonaById(personaId) || getDomainExpertById(personaId);
  if (!persona) return [];

  // Other panelists' responses for context
  const otherContext = allTurns
    .filter((t) => t.personaId !== personaId)
    .map((t) => {
      const p = getPersonaById(t.personaId) || getDomainExpertById(t.personaId);
      return `${p?.name ?? t.personaId}: "${t.response}"`;
    })
    .join("\n");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are ${persona.name}. You just advised someone who asked:
"${question}"

Your response: "${personaResponse}"${otherContext ? `\n\nOthers said:\n${otherContext}` : ""}

Extract 2-3 specific, durable observations about this person — things that will help you advise them better in the future. Focus on:
- What do they deeply care about or value?
- What beliefs or assumptions shape how they think?
- What tensions, fears, or decisions are they wrestling with?
- What patterns appear in how they approach problems?

Be concrete and personal, not generic. Assign importance 1-10 based on how revealing the observation is.

Return ONLY a JSON array: [{"content": "...", "importance": 7}]`,
        },
      ],
    });

    const text = message.content[0];
    if (text.type !== "text") return [];

    const jsonMatch = text.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return (
      parsed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((e: any) => typeof e.content === "string" && typeof e.importance === "number")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((e: any) => ({
          content: String(e.content).slice(0, 240),
          importance: Math.min(10, Math.max(1, Math.round(e.importance))),
        }))
    );
  } catch {
    return [];
  }
}

/**
 * Synthesize 2–3 high-level reflections from accumulated observations.
 * Called when observation count hits a multiple of 8.
 */
export async function synthesizeReflection(
  personaId: string,
  observations: MemoryEntry[]
): Promise<Array<{ content: string; importance: number }>> {
  const client = getAnthropicClient();
  const persona = getPersonaById(personaId) || getDomainExpertById(personaId);
  if (!persona || observations.length < 4) return [];

  const observationsText = observations
    .slice(0, 20)
    .map((o) => `- ${o.content}`)
    .join("\n");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are ${persona.name}. You've had multiple conversations with the same person. Here are your accumulated observations about them:

${observationsText}

Synthesize 2-3 higher-order insights about this person. Go deeper than the individual observations:
- What are they really trying to figure out at a deeper level?
- What keeps coming up across different questions?
- What do they seem to be circling around or not quite saying?
- What does the pattern reveal about them?

These are your private reflections — sharper and more honest than surface observations.

Return ONLY a JSON array: [{"content": "...", "importance": 9}]`,
        },
      ],
    });

    const text = message.content[0];
    if (text.type !== "text") return [];

    const jsonMatch = text.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return (
      parsed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((e: any) => typeof e.content === "string" && typeof e.importance === "number")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((e: any) => ({
          content: String(e.content).slice(0, 240),
          // Reflections are always high-importance (7–10)
          importance: Math.min(10, Math.max(7, Math.round(e.importance))),
        }))
    );
  } catch {
    return [];
  }
}

/**
 * Persist memory entries to Supabase.
 */
export async function saveMemoryEntries(
  supabase: AnySupabase,
  userId: string,
  personaId: string,
  entries: Array<{ content: string; importance: number }>,
  memoryType: "observation" | "reflection",
  options?: { councilRoomId?: string; sourceMessageId?: string }
): Promise<void> {
  if (entries.length === 0) return;

  const rows = entries.map((e) => ({
    user_id: userId,
    persona_id: personaId,
    content: e.content,
    importance: e.importance,
    memory_type: memoryType,
    council_room_id: options?.councilRoomId ?? null,
    source_message_id: options?.sourceMessageId ?? null,
  }));

  await supabase.from("memory_entries").insert(rows);
}

/**
 * Count total observations for a persona about a user.
 * Used to decide when to trigger reflection synthesis (every 8 observations).
 */
export async function countObservations(
  supabase: AnySupabase,
  userId: string,
  personaId: string
): Promise<number> {
  const { count } = await supabase
    .from("memory_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("persona_id", personaId)
    .eq("memory_type", "observation");

  return count ?? 0;
}

/**
 * Format memories for injection into a persona system prompt.
 * Reflections appear first (they're denser), then recent observations.
 */
export function formatMemoriesForPrompt(memories: MemoryEntry[]): string {
  if (memories.length === 0) return "";

  const reflections = memories.filter((m) => m.memoryType === "reflection");
  const observations = memories.filter((m) => m.memoryType === "observation");

  const lines: string[] = [];

  if (reflections.length > 0) {
    lines.push("DEEPER PATTERNS YOU'VE NOTICED ABOUT THIS PERSON:");
    reflections.forEach((r) => lines.push(`- ${r.content}`));
  }

  if (observations.length > 0) {
    if (reflections.length > 0) lines.push("");
    lines.push("WHAT YOU REMEMBER FROM PREVIOUS CONVERSATIONS:");
    // Cap at 5 observations — reflections already carry the synthesis
    observations.slice(0, 5).forEach((o) => lines.push(`- ${o.content}`));
  }

  return lines.join("\n");
}
