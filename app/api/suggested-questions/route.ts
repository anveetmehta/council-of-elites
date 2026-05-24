import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { CouncilMember } from "@/types/council.types";

/**
 * Generates 4 specific, well-formed questions tailored to a council's lineup.
 * Used on the empty state of a new council so users have a concrete starting point.
 *
 * Body: { members: CouncilMember[]; topic?: string }
 * Response: { questions: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const members: CouncilMember[] = body.members ?? [];
    const topic: string | undefined = body.topic;

    if (members.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    const personas = members
      .map((m) => {
        const p = getPersonaById(m.personaId) || getDomainExpertById(m.personaId);
        if (!p) return null;
        return `- ${p.name} (${p.tagline}) — best for: ${(p.askAbout ?? []).slice(0, 3).join(", ") || p.description.slice(0, 80)}`;
      })
      .filter(Boolean)
      .join("\n");

    const topicContext = topic
      ? `\n\nThe user's stated topic: "${topic}". Tailor the questions to this area specifically.`
      : "";

    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      messages: [
        {
          role: "user",
          content: `A user just assembled this council of advisors:

${personas}${topicContext}

Generate 4 specific, well-formed questions this council is uniquely positioned to answer well. Each question should:
- Feel like a real question a person would actually ask
- Be concrete enough that the advisors can give specific advice (include context details where natural)
- Take advantage of the SPECIFIC mix of advisors above
- Vary in topic and depth — mix one tactical, one strategic, one personal, one decision-forcing
- Be 8-18 words long. Not a fragment, a full question.

Return ONLY a JSON array of 4 strings. No prose, no commentary, just the array.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") return NextResponse.json({ questions: [] });

    const text = content.text.trim();
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return NextResponse.json({ questions: [] });
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return NextResponse.json({ questions: [] });
      return NextResponse.json({
        questions: parsed.slice(0, 4).map(String).filter((q) => q.length > 0),
      });
    } catch {
      return NextResponse.json({ questions: [] });
    }
  } catch (err) {
    console.error("suggested-questions error:", err);
    return NextResponse.json({ questions: [] });
  }
}
