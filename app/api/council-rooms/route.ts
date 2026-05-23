import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rooms, error } = await supabase
    .from("council_rooms")
    .select("id, title, topic, members, mode, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rooms || rooms.length === 0) {
    return NextResponse.json({ rooms: [] });
  }

  // Enrich with last question + message count
  const roomIds = rooms.map((r) => r.id);
  const { data: messages } = await supabase
    .from("council_messages")
    .select("council_room_id, user_prompt, created_at")
    .in("council_room_id", roomIds)
    .order("created_at", { ascending: false });

  const lastByRoom = new Map<string, string>();
  const countByRoom = new Map<string, number>();
  for (const msg of messages ?? []) {
    if (!lastByRoom.has(msg.council_room_id)) {
      lastByRoom.set(msg.council_room_id, msg.user_prompt);
    }
    countByRoom.set(msg.council_room_id, (countByRoom.get(msg.council_room_id) ?? 0) + 1);
  }

  const enriched = rooms.map((r) => ({
    ...r,
    lastQuestion: lastByRoom.get(r.id) ?? null,
    questionCount: countByRoom.get(r.id) ?? 0,
  }));

  return NextResponse.json({ rooms: enriched });
}
