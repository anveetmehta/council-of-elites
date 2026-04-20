import { PersonaType } from "@/types/persona.types";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface TierBadgeProps {
  type: PersonaType;
  className?: string;
}

export function TierBadge({ type, className }: TierBadgeProps) {
  if (type === "archetype") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
        "bg-amber-950/40 border-amber-800/50 text-amber-400",
        className
      )}
    >
      <Sparkles size={9} />
      AI-Inspired
    </span>
  );
}
