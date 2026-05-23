import { PersonaDefinition } from "@/types/persona.types";
import { PersonaResponse } from "@/types/council.types";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { TierBadge } from "@/components/personas/TierBadge";
import { getRoleBadgeConfig, getRoleLeftBorderClass, cn } from "@/lib/utils";

interface PersonaResponseCardProps {
  persona: PersonaDefinition;
  response: PersonaResponse;
  skeleton?: boolean;
  isStreaming?: boolean;
  isThinking?: boolean; // Show "X is thinking..." state
  speakerSource?: 'user' | 'director' | 'system'; // Why they're speaking
  hasMemory?: boolean; // Whether this persona has memories of the user
}

export function PersonaResponseCard({
  persona,
  response,
  skeleton = false,
  isStreaming = false,
  isThinking = false,
  speakerSource,
  hasMemory = false,
}: PersonaResponseCardProps) {
  const { label, className: roleClass } = getRoleBadgeConfig(response.role);
  const leftBorder = getRoleLeftBorderClass(response.role);

  // Show thinking state
  if (isThinking) {
    return (
      <div className={cn(
        "rounded-xl border border-surface-border bg-surface-raised p-4 border-l-4 animate-fade-up",
        leftBorder || "border-l-surface-border"
      )}
      style={
        !leftBorder
          ? { borderLeftColor: persona.colorHex }
          : undefined
      }
      >
        <div className="flex items-center gap-2.5">
          <PersonaAvatar persona={persona} size="sm" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              {persona.icon && <span className="mr-1">{persona.icon}</span>}
              <span className="font-semibold">{persona.name}</span> is thinking
            </span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0.1s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (skeleton) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-raised p-4 animate-pulse">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-surface-overlay" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 bg-surface-overlay rounded w-2/3" />
            <div className="h-2 bg-surface-overlay rounded w-1/3" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 bg-surface-overlay rounded w-full" />
          <div className="h-2.5 bg-surface-overlay rounded w-5/6" />
          <div className="h-2.5 bg-surface-overlay rounded w-4/5" />
          <div className="h-2.5 bg-surface-overlay rounded w-3/4" />
          <div className="h-2.5 bg-surface-overlay rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border bg-surface-raised p-4 border-l-4 animate-fade-up",
        leftBorder || "border-l-surface-border"
      )}
      style={
        !leftBorder
          ? { borderLeftColor: persona.colorHex }
          : undefined
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <PersonaAvatar persona={persona} size="sm" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {persona.icon && <span className="text-sm">{persona.icon}</span>}
              <span className="text-xs font-semibold text-text-primary font-serif">
                {persona.name}
              </span>
              <TierBadge type={persona.personaType} />
              {hasMemory && (
                <span
                  title="Has context from past conversations"
                  className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300"
                >
                  <span className="w-1 h-1 rounded-full bg-violet-400" />
                  Knows you
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-text-muted">{persona.tagline}</p>
              {speakerSource === 'user' && (
                <span className="text-[10px] text-accent font-medium">at your request</span>
              )}
            </div>
          </div>
        </div>

        {response.role !== "default" && (
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap", roleClass)}>
            {label}
          </span>
        )}
      </div>

      {/* Response */}
      <div className="response-content text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
        {response.response}
        {isStreaming && (
          <span className="inline-block w-0.5 h-3.5 bg-text-muted animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  );
}
