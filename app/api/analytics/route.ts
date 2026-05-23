import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { CouncilMember } from "@/types/council.types";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rooms
  const { data: rooms } = await supabase
    .from("council_rooms")
    .select("id, members, topic, title, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const roomIds = (rooms ?? []).map((r) => r.id);

  // Recent questions
  let recentQuestions: Array<{ user_prompt: string; created_at: string }> = [];
  let totalQuestions = 0;
  if (roomIds.length > 0) {
    const { data: msgs, count } = await supabase
      .from("council_messages")
      .select("user_prompt, created_at", { count: "exact" })
      .in("council_room_id", roomIds)
      .order("created_at", { ascending: false })
      .limit(30);
    recentQuestions = msgs ?? [];
    totalQuestions = count ?? 0;
  }

  // Persona counts (which advisors you've consulted most)
  const personaCounts: Record<string, number> = {};
  for (const room of rooms ?? []) {
    const members = (room.members as unknown as CouncilMember[]) ?? [];
    for (const member of members) {
      personaCounts[member.personaId] = (personaCounts[member.personaId] ?? 0) + 1;
    }
  }

  const topAdvisors = Object.entries(personaCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => {
      const p = getPersonaById(id) || getDomainExpertById(id);
      return {
        id,
        name: p?.name ?? id,
        tagline: p?.tagline ?? "",
        colorHex: p?.colorHex ?? "#6B7280",
        icon: p?.icon ?? null,
        count,
      };
    });

  // Memory observations per persona (signal of relationship depth)
  const { data: memoryRows } = await supabase
    .from("memory_entries")
    .select("persona_id, content, importance, memory_type")
    .eq("user_id", user.id)
    .order("importance", { ascending: false })
    .limit(100);
  const memoryByPersona: Record<string, number> = {};
  // Top reflections + observations across all personas (for narrative layer)
  const topMemories: Array<{ personaId: string; personaName: string; content: string; importance: number; memoryType: string }> = [];

  for (const row of memoryRows ?? []) {
    memoryByPersona[row.persona_id] = (memoryByPersona[row.persona_id] ?? 0) + 1;
    if (topMemories.length < 8) {
      const p = getPersonaById(row.persona_id) || getDomainExpertById(row.persona_id);
      topMemories.push({
        personaId: row.persona_id,
        personaName: p?.name ?? row.persona_id,
        content: row.content,
        importance: row.importance,
        memoryType: row.memory_type,
      });
    }
  }

  const advisorsKnowingYou = Object.entries(memoryByPersona)
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a)
    .map(([id, count]) => {
      const p = getPersonaById(id) || getDomainExpertById(id);
      return {
        id,
        name: p?.name ?? id,
        tagline: p?.tagline ?? "",
        colorHex: p?.colorHex ?? "#6B7280",
        observations: count,
      };
    });

  return NextResponse.json({
    totalSessions: rooms?.length ?? 0,
    totalQuestions,
    recentQuestions: recentQuestions.slice(0, 10),
    topAdvisors,
    advisorsKnowingYou,
    topMemories,
  });
}
