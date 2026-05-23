import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Public endpoint — no auth required, uses room UUID for obscurity
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch room without user_id constraint (public by UUID)
  const { data: room, error: roomErr } = await supabase
    .from("council_rooms")
    .select("id, title, topic, members, mode, created_at")
    .eq("id", id)
    .single();

  if (roomErr || !room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch messages
  const { data: messages, error: msgErr } = await supabase
    .from("council_messages")
    .select(
      "id, user_prompt, persona_responses, conversation_turns, moderator_output, auto_summary, session_artifact, created_at"
    )
    .eq("council_room_id", id)
    .order("created_at", { ascending: true });

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({ room, messages: messages ?? [] });
}
