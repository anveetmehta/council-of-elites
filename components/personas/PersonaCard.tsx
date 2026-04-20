"use client";

import { useState } from "react";
import { PersonaDefinition } from "@/types/persona.types";
import { PersonaAvatar } from "./PersonaAvatar";
import { TierBadge } from "./TierBadge";
import { cn } from "@/lib/utils";

interface PersonaCardProps {
  persona: PersonaDefinition;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (persona: PersonaDefinition) => void;
  onClick?: () => void;
  className?: string;
  expanded?: boolean;
}

export function PersonaCard({
  persona,
  selectable = false,
  selected = false,
  onSelect,
  onClick,
  className,
  expanded = false,
}: PersonaCardProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  function handleClick() {
    if (!selectable && !onClick) {
      setIsExpanded(!isExpanded);
    } else if (selectable && onSelect) {
      onSelect(persona);
    } else if (onClick) {
      onClick();
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative rounded-xl border transition-all duration-150 p-4",
        "bg-surface-raised border-surface-border",
        selectable || onClick
          ? "cursor-pointer hover:border-surface-overlay hover:bg-surface-overlay"
          : "cursor-pointer hover:border-accent/30",
        selected
          ? "border-accent/60 bg-accent-muted/20 ring-1 ring-accent/30"
          : "",
        className
      )}
    >
      {/* Selection indicator */}
      {selectable && (
        <div
          className={cn(
            "absolute top-3 right-3 w-4 h-4 rounded border-2 transition-all",
            selected
              ? "bg-accent border-accent"
              : "border-surface-border group-hover:border-text-muted"
          )}
        >
          {selected && (
            <svg className="w-2.5 h-2.5 text-white absolute top-0 left-0" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        <PersonaAvatar persona={persona} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            {persona.icon && <span className="text-lg">{persona.icon}</span>}
            <h3 className="text-sm font-medium text-text-primary font-serif leading-tight">
              {persona.name}
            </h3>
            <TierBadge type={persona.personaType} />
          </div>
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
            {persona.tagline}
          </p>
        </div>
      </div>

      {/* Known for chips */}
      {persona.knownFor && persona.knownFor.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1.5">
            Known for
          </p>
          <div className="flex flex-wrap gap-1.5">
            {persona.knownFor.slice(0, 3).map((item) => (
              <span
                key={item}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-overlay border border-surface-border text-text-secondary"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ask about chips */}
      {persona.askAbout && persona.askAbout.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1.5">
            Ask about
          </p>
          <div className="flex flex-wrap gap-1.5">
            {persona.askAbout.slice(0, 3).map((item) => (
              <span
                key={item}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent-muted/30 border border-accent/20 text-accent-muted"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expanded narrative section */}
      {isExpanded && persona.narrative && (
        <div className="mt-4 pt-3 border-t border-surface-border">
          <p className="text-[11px] text-text-secondary leading-relaxed italic">
            {persona.narrative}
          </p>
        </div>
      )}
    </div>
  );
}
