"use client";

interface FollowUpChipsProps {
  chips: string[];
  onChipClick: (chip: string) => void;
  /** When true, render as "quick replies" — possible answers to a handoff question. */
  isAnswerOptions?: boolean;
}

export function FollowUpChips({ chips, onChipClick, isAnswerOptions = false }: FollowUpChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="pt-1 animate-fade-up">
      {isAnswerOptions && (
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-medium">
          Quick replies
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip, i) => (
          <button
            key={i}
            onClick={() => onChipClick(chip)}
            className={
              isAnswerOptions
                ? "px-3 py-1.5 text-xs rounded-full border border-accent/30 bg-accent/5 text-text-secondary hover:border-accent/60 hover:bg-accent/10 hover:text-text-primary transition-colors cursor-pointer"
                : "px-3 py-1.5 text-xs rounded-full border border-surface-border bg-surface-raised text-text-secondary hover:border-accent/40 hover:text-text-primary transition-colors cursor-pointer"
            }
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
