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
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Someone is asking for advice on: "${topic.trim()}"

First, classify the REGISTER of this question:
- "analytical": business/strategy/technical/decision-making with clear stakes
- "emotional": personal/relational/identity/life-direction with feelings present
- "mixed": both analytical and emotional weight
- "intellectual": philosophy/ideas/exploration without high stakes

This matters. An "analytical" question gets sharp operators and contrarians. An "emotional" question MUST include The Empathetic Coach. A "mixed" question needs both registers in the room. An "intellectual" question gets philosophers and reframers.

Available advisors:
${JSON.stringify(catalog, null, 0)}

Pick 3-4 advisors. Match the register. Aim for genuine perspective divergence — not 3 analysts saying similar things.

Hard rules:
- If register is "emotional" or "mixed", include "imani-wright" (the Coach)
- At most 1 moderator
- At most 1 questioner
- Pick advisors whose worldviews would actually CONFLICT in interesting ways
- Match advisor specialty (conductorTags) to the topic domain

Also write a single PREVIEW line — one sentence describing the dynamic this panel will produce. Format: "[Name] will [verb] [specific thing]. [Name] will [verb] [specific thing]. [Name] will [verb] [specific thing]."

Respond ONLY with valid JSON in this exact shape:
{
  "register": "analytical|emotional|mixed|intellectual",
  "preview": "single sentence describing the dynamic",
  "recommendations": [
    {"id": "persona-id", "role": "advocate|critic|moderator|questioner|default", "reason": "one sentence why this advisor adds value to THIS question"}
  ]
}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
    }

    const text = content.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse recommendations" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.recommendations)) {
      return NextResponse.json({ error: "Malformed recommendations" }, { status: 500 });
    }

    const validated = parsed.recommendations
      .filter((r: Record<string, unknown>) => allPersonas.some((p) => p.id === r.id))
      .slice(0, 4)
      .map((r: Record<string, unknown>) => ({
        id: r.id as string,
        role: VALID_ROLES.includes(r.role as CouncilRole) ? (r.role as CouncilRole) : "default",
        reason: typeof r.reason === "string" ? r.reason : "",
      }));

    return NextResponse.json({
      recommendations: validated,
      register: typeof parsed.register === "string" ? parsed.register : "analytical",
      preview: typeof parsed.preview === "string" ? parsed.preview : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
