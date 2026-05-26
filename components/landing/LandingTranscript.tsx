import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { PersonaAvatar } from "@/components/personas/PersonaAvatar";

interface TranscriptTurn {
  personaId: string;
  text: string;
}

const SAMPLE_QUESTION = "Should I leave my job to bootstrap, or raise funding for my idea?";

const SAMPLE_TURNS: TranscriptTurn[] = [
  {
    personaId: "eitan-bergmann",
    text: "May I be impolite? You're asking bootstrap-vs-raise, but that's not the real question. The real question is: do you believe in this idea enough to find out if it's true? Because funding debates are a sophisticated way to avoid committing. Hana — what do the numbers say about this?",
  },
  {
    personaId: "hana-mori",
    text: "The numbers say: what's the unit economics story? If this business needs scale to work, you need capital and you probably need it now. If it works at small scale with strong margins, bootstrap and you keep the upside. Eitan is right that the question underneath is: which of those is this?",
  },
  {
    personaId: "maya-krishnan",
    text: "Okay. Three moves from now — if you raise, who else raises in this space in the next 18 months? And what does that competition look like when you've spent half your runway building? The answer to that question is more important than your current burn rate.",
  },
];

export function LandingTranscript() {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-raised/40 backdrop-blur-sm overflow-hidden">
      {/* Question */}
      <div className="px-5 py-4 border-b border-surface-border bg-surface-overlay/30">
        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5">
          The question
        </p>
        <p className="text-sm text-text-primary leading-relaxed">
          "{SAMPLE_QUESTION}"
        </p>
      </div>

      {/* Turns */}
      <div className="divide-y divide-surface-border">
        {SAMPLE_TURNS.map((turn, idx) => {
          const persona =
            getPersonaById(turn.personaId) || getDomainExpertById(turn.personaId);
          if (!persona) return null;
          return (
            <div
              key={idx}
              className="px-5 py-5 border-l-4"
              style={{ borderLeftColor: persona.colorHex }}
            >
              <div className="flex items-start gap-3">
                <PersonaAvatar persona={persona} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-serif italic font-semibold text-text-primary">
                      {persona.name}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {persona.tagline}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {turn.text}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-surface-border bg-surface-overlay/20">
        <p className="text-[11px] text-text-muted italic">
          Three voices, two challenges, no committee-speak. This is what your conversation looks like.
        </p>
      </div>
    </div>
  );
}
