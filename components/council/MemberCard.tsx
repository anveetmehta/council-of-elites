"use client";

import { useState } from "react";
import { PersonaDefinition } from "@/types/persona.types";
import { CouncilMember, CouncilRole, MemberAttributes } from "@/types/council.types";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { getRoleBadgeConfig } from "@/lib/utils";
import { ChevronDown, X, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemberCardProps {
  persona: PersonaDefinition;
  member: CouncilMember;
  onRoleChange: (role: CouncilRole) => void;
  onAttributeChange: (attrs: MemberAttributes) => void;
  onRemove: () => void;
}

const ROLES: { value: CouncilRole; label: string; desc: string }[] = [
  { value: "default", label: "Open", desc: "Pure persona voice, no role" },
  { value: "advocate", label: "For", desc: "Argues in favor" },
  { value: "critic", label: "Against", desc: "Argues against, finds flaws" },
  { value: "moderator", label: "Moderator", desc: "Synthesizes after others respond" },
  { value: "questioner", label: "Questions", desc: "Asks probing questions only" },
];

export function MemberCard({ persona, member, onRoleChange, onAttributeChange, onRemove }: MemberCardProps) {
  const [showAttrs, setShowAttrs] = useState(false);
  const { label, className: roleClass } = getRoleBadgeConfig(member.role);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-overlay overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <PersonaAvatar persona={persona} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">
            {persona.name}
          </p>
        </div>

        {/* Role selector */}
        <div className="relative">
          <select
            value={member.role}
            onChange={(e) => onRoleChange(e.target.value as CouncilRole)}
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded border cursor-pointer bg-transparent appearance-none pr-4",
              roleClass
            )}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value} className="bg-surface-overlay text-text-primary">
                {r.label}
              </option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-0.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60" />
        </div>

        <button
          onClick={() => setShowAttrs(!showAttrs)}
          className={cn(
            "p-1 rounded transition-colors",
            showAttrs ? "text-accent" : "text-text-muted hover:text-text-secondary"
          )}
          title="Customize"
        >
          <Settings2 size={12} />
        </button>

        <button
          onClick={onRemove}
          className="p-1 rounded text-text-muted hover:text-red-400 transition-colors"
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>

      {/* Attributes panel */}
      {showAttrs && (
        <div className="px-3 pb-3 pt-0 border-t border-surface-border space-y-2">
          <div>
            <label className="block text-[10px] text-text-muted mb-1">Focus area (optional)</label>
            <input
              type="text"
              placeholder="e.g. financial implications"
              defaultValue={member.attributes?.focusArea || ""}
              onChange={(e) =>
                onAttributeChange({ ...member.attributes, focusArea: e.target.value || undefined })
              }
              className="w-full px-2 py-1 rounded text-xs bg-surface-raised border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="block text-[10px] text-text-muted mb-1">Context about you (optional)</label>
            <input
              type="text"
              placeholder="e.g. early-stage founder, no funding yet"
              defaultValue={member.attributes?.context || ""}
              onChange={(e) =>
                onAttributeChange({ ...member.attributes, context: e.target.value || undefined })
              }
              className="w-full px-2 py-1 rounded text-xs bg-surface-raised border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}
