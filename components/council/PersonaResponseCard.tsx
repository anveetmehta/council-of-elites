import { PersonaDefinition } from "@/types/persona.types";
import { PersonaResponse } from "@/types/council.types";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";
import { TierBadge } from "@/components/personas/TierBadge";
import { getRoleBadgeConfig, getRoleLeftBorderClass, cn } from "@/lib/utils";

/** 4% opacity role tints — subliminal texture, never garish */
const ROLE_TINT_COLORS: Record<string, string> = {
  advocate:   "rgba(21,128,61,0.04)",
  critic:     "rgba(185,28,28,0.04)",
  moderator:  "rgba(109,40,217,0.04)",
  questioner: "rgba(29,78,216,0.04)",
};

/** Role left-border colors (matches Tailwind border-l-role-* values) */
const ROLE_LEFT_COLORS: Record<string, string> = {
  advocate:   "#15803D",
  critic:     "#B91C1C",
  moderator:  "#6D28D9",
  questioner: "#1D4ED8",
};

/** Renders plain text, converting *word* and **word** markdown emphasis to <em>/<strong> */
function ResponseText({ text }: { text: string }) {
  // Split on **bold** and *italic* patterns, render inline
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

interface PersonaResponseCardProps {
  persona: PersonaDefinition;
  response: PersonaResponse;
  skeleton?: boolean;
  isStreaming?: boolean;
  isThinking?: boolean; // Show "X is thinking..." state
  speakerSource?: 'user' | 'director' | 'system'; // Why they're speaking
  hasMemory?: boolean; // Whether this persona has memories of the user
  isScoping?: boolean; // This is a "setting context" turn before any takes
  isHandoff?: boolean; // This turn hands the conversation back to the user
}

export function PersonaResponseCard({
  persona,
  response,
  skeleton = false,
  isStreaming = false,
  isThinking = false,
  speakerSource,
  hasMemory = false,
  isScoping = false,
  isHandoff = false,
}: PersonaResponseCardProps) {
  const { label, className: roleClass } = getRoleBadgeConfig(response.role);
  const leftBorder = getRoleLeftBorderClass(response.role);

  // Role-tinted background (4% opacity, subliminal differentiation)
  const roleTint = ROLE_TINT_COLORS[response.role];
  // Color used for streaming shimmer overlay (matches left border)
  const streamingColor = ROLE_LEFT_COLORS[response.role] || persona.colorHex;

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
        "relative rounded-xl border bg-surface-raised p-4 border-l-4 animate-fade-up",
        leftBorder || "border-l-surface-border",
        isHandoff
          ? "border-accent/40 ring-1 ring-accent/20 bg-gradient-to-b from-accent/5 to-transparent"
          : isScoping
          ? "border-surface-border opacity-90"
          : "border-surface-border"
      )}
      style={{
        ...(!leftBorder ? { borderLeftColor: persona.colorHex } : {}),
        // Role-tinted background: subliminal 4% tint differentiates card texture by debate role
        ...(roleTint && !isHandoff ? { backgroundColor: roleTint } : {}),
      }}
    >
      {/* Streaming left-border breath shimmer */}
      {isStreaming && (
        <span
          className="absolute inset-y-0 left-0 w-1 rounded-l-xl animate-stream-breath pointer-events-none"
          style={{ backgroundColor: streamingColor }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <PersonaAvatar persona={persona} size="sm" />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {persona.icon && <span className="text-sm">{persona.icon}</span>}
              {/* Persona name: 13px serif italic (design spec: "byline" step) */}
              <span className="text-[13px] font-semibold text-text-primary font-serif italic">
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
              {isScoping && (
                <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  Scoping
                </span>
              )}
              {isHandoff && (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/15 border border-accent/40 text-accent">
                  Over to you
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

        {response.role !== "default" && !isScoping && !isHandoff && (
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap", roleClass)}>
            {label}
          </span>
        )}
      </div>

      {/* Response — 14px Jakarta, line-height 1.75 (design spec: "body" step) */}
      <div className={cn(
        "response-content text-sm leading-[1.75]",
        isHandoff ? "text-text-primary" : "text-text-secondary"
      )}>
        <ResponseText text={response.response} />
        {isStreaming && (
          <span className="inline-block w-0.5 h-3.5 bg-text-muted animate-pulse ml-0.5 align-middle" />
        )}
      </div>

      {/* Handoff prompt indicator */}
      {isHandoff && !isStreaming && (
        <div className="mt-3 pt-3 border-t border-accent/15 flex items-center gap-2 text-[10px] text-accent">
          <span>↓ Answer below to continue</span>
        </div>
      )}
    </div>
  );
}
