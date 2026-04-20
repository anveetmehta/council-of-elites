import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
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

  // --- Personal data ---
  const { data: rooms } = await supabase
    .from("council_rooms")
    .select("id, members, mode, created_at")
    .eq("user_id", user.id);

  const roomIds = (rooms ?? []).map((r) => r.id);

  // Count messages across user's rooms
  let messageCount = 0;
  if (roomIds.length > 0) {
    const { count } = await supabase
      .from("council_messages")
      .select("id", { count: "exact", head: true })
      .in("council_room_id", roomIds);
    messageCount = count ?? 0;
  }

  // Count feedback submitted by user
  const { count: feedbackCount } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Aggregate persona and role usage from rooms[].members JSONB
  const personaCounts: Record<string, number> = {};
  const roleCounts: Record<string, number> = {
    advocate: 0,
    critic: 0,
    moderator: 0,
    questioner: 0,
    default: 0,
  };

  for (const room of rooms ?? []) {
    const members = (room.members as unknown as CouncilMember[]) ?? [];
    for (const member of members) {
      personaCounts[member.personaId] = (personaCounts[member.personaId] ?? 0) + 1;
      const role = member.role in roleCounts ? member.role : "default";
      roleCounts[role] = (roleCounts[role] ?? 0) + 1;
    }
  }

  const topPersonas = Object.entries(personaCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([id, count]) => {
      const p = getPersonaById(id) || getDomainExpertById(id);
      return {
        id,
        name: p?.name ?? id,
        colorHex: p?.colorHex ?? "#6B7280",
        count,
      };
    });

  // --- Platform data (service role key required) ---
  let platform: {
    totalUsers: number;
    totalCouncils: number;
    totalQuestions: number;
  } | null = null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    try {
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey
      );

      const [roomsResult, msgsResult, userIdsResult] = await Promise.all([
        adminClient.from("council_rooms").select("id", { count: "exact", head: true }),
        adminClient.from("council_messages").select("id", { count: "exact", head: true }),
        adminClient.from("council_rooms").select("user_id"),
      ]);

      const uniqueUsers = new Set(
        (userIdsResult.data ?? []).map((r: { user_id: string }) => r.user_id)
      ).size;

      platform = {
        totalUsers: uniqueUsers,
        totalCouncils: roomsResult.count ?? 0,
        totalQuestions: msgsResult.count ?? 0,
      };
    } catch {
      // Service role unavailable — skip platform stats
    }
  }

  const councilCount = rooms?.length ?? 0;

  return NextResponse.json({
    platform,
    personal: {
      councils: councilCount,
      questions: messageCount,
      feedback: feedbackCount ?? 0,
      avgQuestionsPerCouncil:
        councilCount > 0
          ? Math.round((messageCount / councilCount) * 10) / 10
          : 0,
      topPersonas,
      roleBreakdown: roleCounts,
    },
  });
}
