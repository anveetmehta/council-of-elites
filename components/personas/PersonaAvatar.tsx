import { cn } from "@/lib/utils";
import { PersonaDefinition } from "@/types/persona.types";

interface PersonaAvatarProps {
  persona: PersonaDefinition;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-xl",
};

export function PersonaAvatar({ persona, size = "md", className }: PersonaAvatarProps) {
  const initials = persona.name
    .replace(/^The\s/, "")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center font-semibold shrink-0",
        sizeMap[size],
        className
      )}
      style={{
        backgroundColor: `${persona.colorHex}20`,
        border: `1px solid ${persona.colorHex}40`,
        color: persona.colorHex,
      }}
    >
      {initials}
    </div>
  );
}
