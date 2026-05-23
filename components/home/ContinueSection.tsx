import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CouncilMember, CouncilRoom } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { formatRelativeTime } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

async function fetchRecent(userId: string) {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("council_rooms")
    .select("id, title, members, updated_at, created_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(3);

  if (!rooms || rooms.length === 0) return [];

  // Fetch last question per room
  const roomIds = rooms.map((r) => r.id);
  const { data: lastMessages } = await supabase
    .from("council_messages")
    .select("council_room_id, user_prompt, created_at")
    .in("council_room_id", roomIds)
    .order("created_at", { ascending: false });

  const lastByRoom = new Map<string, string>();
  for (const msg of lastMessages ?? []) {
    if (!lastByRoom.has(msg.council_room_id)) {
      lastByRoom.set(msg.council_room_id, msg.user_prompt);
    }
  }

  // Count questions per room
  const { data: counts } = await supabase
    .from("council_messages")
    .select("council_room_id")
    .in("council_room_id", roomIds);

  const countByRoom = new Map<string, number>();
  for (const c of counts ?? []) {
    countByRoom.set(c.council_room_id, (countByRoom.get(c.council_room_id) ?? 0) + 1);
  }

  return rooms.map((r) => ({
    room: r as unknown as CouncilRoom,
    lastQuestion: lastByRoom.get(r.id) ?? null,
    questionCount: countByRoom.get(r.id) ?? 0,
  }));
}

export async function ContinueSection({ userId }: { userId: string }) {
  const recent = await fetchRecent(userId);
  if (recent.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
          Continue thinking
        </h2>
        <Link
          href="/history"
          className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
        >
          All sessions <ArrowRight size={11} />
        </Link>
      </div>
      <div className="space-y-2">
        {recent.map(({ room, lastQuestion, questionCount }) => {
          const members = (room.members as unknown as CouncilMember[]) ?? [];
          const personas = members
            .slice(0, 4)
            .map((m) => getPersonaById(m.personaId) || getDomainExpertById(m.personaId))
            .filter(Boolean);

          return (
            <Link
              key={room.id}
              href={`/council/${room.id}`}
              className="group flex items-start gap-4 px-4 py-3.5 rounded-xl border border-surface-border bg-surface-raised hover:bg-surface-overlay hover:border-surface-overlay transition-all"
            >
              <div className="flex -space-x-2 shrink-0 pt-0.5">
                {personas.map(
                  (p) =>
                    p && (
                      <PersonaAvatar
                        key={p.id}
                        persona={p}
                        size="sm"
                        className="ring-2 ring-surface-raised group-hover:ring-surface-overlay transition-all"
                      />
                    )
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="text-sm font-serif italic text-text-primary truncate">
                    {room.title || "New Council"}
                  </p>
                  <span className="text-[10px] text-text-muted shrink-0">
                    {formatRelativeTime(room.updated_at)}
                  </span>
                </div>
                {lastQuestion && (
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 mb-1.5">
                    "{lastQuestion}"
                  </p>
                )}
                <p className="text-[10px] text-text-muted">
                  {questionCount} {questionCount === 1 ? "question" : "questions"} ·{" "}
                  {personas.map((p) => p?.name.replace(/^The\s/, "")).join(", ")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
