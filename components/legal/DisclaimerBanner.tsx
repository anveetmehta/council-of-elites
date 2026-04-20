import { AlertCircle } from "lucide-react";
import { PersonaDefinition } from "@/types/persona.types";

interface DisclaimerBannerProps {
  personas: PersonaDefinition[];
}

export function DisclaimerBanner({ personas }: DisclaimerBannerProps) {
  const domainExperts = personas.filter((p) => p.personaType === "domain_expert");
  if (domainExperts.length === 0) return null;

  const names = domainExperts
    .map((p) => p.name.replace(/^The\s/, "").replace(/\sPerspective$/, ""))
    .join(", ");

  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-amber-950/20 border border-amber-800/30 text-amber-300/80 text-xs leading-relaxed">
      <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-400/60" />
      <p>
        This council includes AI-generated perspectives inspired by{" "}
        <span className="text-amber-300">{names}</span>{domainExperts.length === 1 ? "'s" : "'"}{" "}
        publicly available writings and stated views. Not affiliated with or
        endorsed by these individuals. For educational purposes only — not
        professional advice.
      </p>
    </div>
  );
}
