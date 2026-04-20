import { Layers } from "lucide-react";

interface CouncilSummaryProps {
  summary: string;
  type: "auto" | "moderator";
  moderatorName?: string;
  isStreaming?: boolean;
}

export function CouncilSummary({
  summary,
  type,
  moderatorName,
  isStreaming = false,
}: CouncilSummaryProps) {
  return (
    <div className="rounded-xl border border-accent/20 bg-accent-muted/10 p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Layers size={13} className="text-accent" />
        <span className="text-xs font-semibold text-accent">
          {type === "moderator" && moderatorName
            ? `${moderatorName} — Synthesis`
            : "Council Synthesis"}
        </span>
      </div>
      {isStreaming && !summary ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-2.5 bg-accent/10 rounded w-full" />
          <div className="h-2.5 bg-accent/10 rounded w-4/5" />
          <div className="h-2.5 bg-accent/10 rounded w-3/4" />
        </div>
      ) : (
        <div className="response-content text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
          {summary}
          {isStreaming && (
            <span className="inline-block w-0.5 h-3.5 bg-text-muted animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      )}
    </div>
  );
}
