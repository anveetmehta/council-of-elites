"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CouncilRoom } from "@/types/council.types";
import { CouncilMember } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { formatRelativeTime } from "@/lib/utils";
import { Loader2, MessageSquare, Plus } from "lucide-react";

export default function HistoryPage() {
  const [rooms, setRooms] = useState<CouncilRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/council-rooms")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load history");
        return r.json();
      })
      .then((d) => setRooms(d.rooms ?? []))
      .catch(() => setError("Could not load your history. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary mb-1">History</h1>
          <p className="text-sm text-text-secondary">All your past council sessions.</p>
        </div>
        <Link
          href="/council/new"
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border bg-surface-raised hover:bg-surface-overlay text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <Plus size={14} />
          New
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-text-muted" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-text-muted hover:text-text-secondary underline"
          >
            Try again
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare size={32} className="text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-sm text-text-secondary mb-1">No councils yet</p>
          <p className="text-xs text-text-muted mb-6">Start your first council to get multi-perspective advice.</p>
          <Link
            href="/council/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-sm font-medium text-white transition-colors"
          >
            Build a council
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <CouncilRoomItem key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}

function CouncilRoomItem({ room }: { room: CouncilRoom }) {
  const members = (room.members as unknown as CouncilMember[]) ?? [];
  const personas = members
    .slice(0, 4)
    .map((m) => getPersonaById(m.personaId) || getDomainExpertById(m.personaId))
    .filter(Boolean);

  return (
    <Link
      href={`/council/${room.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl border border-surface-border bg-surface-raised hover:bg-surface-overlay transition-colors group"
    >
      {/* Persona avatars */}
      <div className="flex -space-x-2 shrink-0">
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

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {room.title || "Untitled Council"}
        </p>
        <p className="text-xs text-text-muted truncate">
          {personas.map((p) => p?.name).join(" · ")}
        </p>
      </div>

      {/* Time */}
      <span className="text-xs text-text-muted shrink-0">
        {formatRelativeTime(room.updated_at)}
      </span>
    </Link>
  );
}
