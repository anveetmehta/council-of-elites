import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { getAllArchetypePersonas } from "@/data/personas";
import { getAllDomainExperts } from "@/data/domain-experts";
import { createClient } from "@/lib/supabase/server";
import { CouncilRole } from "@/types/council.types";

const VALID_ROLES: CouncilRole[] = ["advocate", "critic", "moderator", "questioner", "default"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { topic?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { topic } = body;
  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    return NextResponse.json({ error: "Topic required" }, { status: 400 });
  }

  const allPersonas = [...getAllArchetypePersonas(), ...getAllDomainExperts()];

  // Build a compact persona catalog for the LLM
  const catalog = allPersonas.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.personaType,
    archetype: p.archetype,
    tagline: p.tagline,
    traits: p.traits,
  }));

  const client = getAnthropicClient();

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `A user wants advice on: "${topic.trim()}"

Available advisors:
${JSON.stringify(catalog, null, 0)}

Pick 3-4 advisors that would create the best council for this topic. For each, assign a role and write a one-sentence reason.

Respond ONLY with a JSON array:
[{"id": "persona-id", "role": "advocate|critic|moderator|questioner|default", "reason": "one sentence why"}]

Rules:
- At most 1 moderator, at most 1 questioner
- Pick advisors with genuinely different perspectives (not 3 analysts)
- Match the topic: philosophy questions need philosophers, business needs strategists/builders
- The "reason" should explain the value they add to THIS specific discussion`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
    }

    // Parse the JSON response with fallback
    const text = content.text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse recommendations" }, { status: 500 });
    }

    const recommendations = JSON.parse(jsonMatch[0]);

    // Validate each recommendation has a valid persona ID and role
    const validated = recommendations
      .filter((r: Record<string, unknown>) => allPersonas.some((p) => p.id === r.id))
      .slice(0, 4)
      .map((r: Record<string, unknown>) => ({
        id: r.id as string,
        role: VALID_ROLES.includes(r.role as CouncilRole) ? (r.role as CouncilRole) : "default",
        reason: typeof r.reason === "string" ? r.reason : "",
      }));

    return NextResponse.json({ recommendations: validated });
  } catch {
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
