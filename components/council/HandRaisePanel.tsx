"use client";

import { useState } from "react";
import { CouncilMember } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { cn } from "@/lib/utils";

interface HandRaisePanelProps {
  members: CouncilMember[];
  onPersonaSelected: (personaId: string) => void;
  disabled?: boolean;
}

export function HandRaisePanel({
  members,
  onPersonaSelected,
  disabled = false,
}: HandRaisePanelProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const availableMembers = members.filter((m) => m.role !== "moderator");

  const handleSelect = (personaId: string) => {
    if (selected || disabled) return;
    setSelected(personaId);
    onPersonaSelected(personaId);
  };

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised/50 px-4 py-3 animate-fade-up">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          Direct a response
        </p>
        {selected && (
          <span className="text-[10px] text-accent font-medium">Speaking next</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {availableMembers.map((member) => {
          const persona = getPersonaById(member.personaId) || getDomainExpertById(member.personaId);
          if (!persona) return null;

          const isSelected = selected === member.personaId;
          const isDisabledState = disabled || !!(selected && !isSelected);

          return (
            <button
              key={member.personaId}
              onClick={() => handleSelect(member.personaId)}
              disabled={isDisabledState}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all",
                isSelected
                  ? "bg-accent/15 border-accent/40 text-accent font-medium"
                  : isDisabledState
                  ? "border-surface-border text-text-muted opacity-40 cursor-not-allowed"
                  : "border-surface-border text-text-secondary hover:border-accent/40 hover:text-accent hover:bg-accent/10 cursor-pointer"
              )}
            >
              {persona.icon && <span className="text-xs">{persona.icon}</span>}
              <span>{persona.name.replace(/^The\s/, "")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
