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
    personaId: "munger-style",
    text: "Inversion first: list what would guarantee you regret each path in five years. Most founders confuse momentum with progress. Naval, you write about leverage constantly — doesn't bootstrapping force exactly the discipline that outside funding postpones?",
  },
  {
    personaId: "naval-style",
    text: "Charlie's right about the discipline. But I'd push back — bootstrapping forces discipline at the cost of slope. The real question isn't bootstrap-vs-raise. It's whether your idea compounds at scale or works fine at small scale. That answer determines everything.",
  },
  {
    personaId: "sharp-contrarian",
    text: "Both of you are answering the question they asked. The question they're avoiding is whether they actually believe in this enough to leave their job. Strategy debates are a way to feel productive without committing. What are you really doing here?",
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
