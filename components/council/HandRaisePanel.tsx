"use client";

import { useState, useEffect } from "react";
import { CouncilMember, ConversationTurn } from "@/types/council.types";
import { PersonaDefinition } from "@/types/persona.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { cn } from "@/lib/utils";

interface HandRaisePanelProps {
  members: CouncilMember[];
  onPersonaSelected: (personaId: string) => void;
  disabled?: boolean;
  countdown?: number; // Seconds remaining (optional visual)
}

export function HandRaisePanel({
  members,
  onPersonaSelected,
  disabled = false,
  countdown = 2
}: HandRaisePanelProps) {
  const [timeLeft, setTimeLeft] = useState(countdown);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (timeLeft <= 0 || selected) return;
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, selected]);

  const availableMembers = members.filter((m) => m.role !== "moderator");

  const handleSelect = (personaId: string) => {
    setSelected(personaId);
    onPersonaSelected(personaId);
  };

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised/50 p-4 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
          Who should speak next?
        </p>
        {!selected && (
          <span className="text-[10px] text-text-muted">
            {timeLeft}s
          </span>
        )}
        {selected && (
          <span className="text-[10px] text-accent-muted font-medium">
            Selected
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {availableMembers.map((member) => {
          const persona = getPersonaById(member.personaId) || getDomainExpertById(member.personaId);
          if (!persona) return null;

          const isSelected = selected === member.personaId;
          const isDisabledState = disabled || !!(selected && !isSelected);

          return (
            <button
              key={member.personaId}
              onClick={() => handleSelect(member.personaId)}
              disabled={isDisabledState ?? false}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                isSelected
                  ? "bg-accent/20 border-accent text-accent font-semibold"
                  : isDisabledState
                  ? "border-surface-border text-text-muted opacity-50 cursor-not-allowed"
                  : "border-surface-border text-text-secondary hover:border-accent hover:text-accent hover:bg-accent/10 cursor-pointer"
              )}
            >
              {persona.icon && <span>{persona.icon}</span>}
              <span className="truncate">{persona.name}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-text-muted mt-3">
        Click a name to request they speak next, or wait for the director's suggestion.
      </p>
    </div>
  );
}
