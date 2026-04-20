"use client";

import { useRouter } from "next/navigation";
import { RecommendedCouncil } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { getRoleBadgeConfig } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { trackEvent, Events } from "@/lib/analytics";

interface RecommendedCouncilCardProps {
  council: RecommendedCouncil;
}

export function RecommendedCouncilCard({ council }: RecommendedCouncilCardProps) {
  const router = useRouter();

  function handleClick() {
    trackEvent(Events.RECOMMENDED_COUNCIL_USED, {
      councilId: council.id,
      topic: council.topic,
    });
    const membersParam = encodeURIComponent(JSON.stringify(council.members));
    router.push(`/council/new?recommended=${council.id}&members=${membersParam}`);
  }

  return (
    <button
      onClick={handleClick}
      className="text-left group p-5 rounded-xl border border-surface-border bg-surface-raised hover:bg-surface-overlay hover:border-surface-overlay transition-all"
    >
      {/* Persona avatars row */}
      <div className="flex -space-x-2 mb-4">
        {council.members.map(({ personaId, role }) => {
          const persona = getPersonaById(personaId) || getDomainExpertById(personaId);
          if (!persona) return null;
          const { label, className: roleClass } = getRoleBadgeConfig(role);
          return (
            <div key={personaId} className="relative">
              <PersonaAvatar
                persona={persona}
                size="sm"
                className="ring-2 ring-surface-raised"
              />
              {role !== "default" && (
                <span
                  className={`absolute -bottom-1 -right-1 text-[8px] font-bold px-0.5 rounded border ${roleClass} leading-none py-px`}
                >
                  {label[0]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <h3 className="text-sm font-semibold text-text-primary mb-1 group-hover:text-accent transition-colors">
        {council.title}
      </h3>
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        {council.description}
      </p>

      {/* Sample question */}
      <p className="text-[11px] text-text-muted italic leading-relaxed border-l-2 border-surface-border pl-3 mb-3">
        &ldquo;{council.sampleQuestion}&rdquo;
      </p>

      {/* Tags */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {council.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-[10px] text-text-muted bg-surface-overlay border border-surface-border"
            >
              {tag}
            </span>
          ))}
        </div>
        <ArrowRight size={13} className="text-text-muted group-hover:text-accent transition-colors shrink-0" />
      </div>
    </button>
  );
}
