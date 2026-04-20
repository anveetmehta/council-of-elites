import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { councilMessageId, personaId, rating, comment } = body;

  if (!councilMessageId || !rating || ![1, -1].includes(rating)) {
    return NextResponse.json({ error: "Invalid feedback data" }, { status: 400 });
  }

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    council_message_id: councilMessageId,
    persona_id: personaId || null,
    rating,
    comment: comment || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
