"use client";

interface FollowUpChipsProps {
  chips: string[];
  onChipClick: (chip: string) => void;
}

export function FollowUpChips({ chips, onChipClick }: FollowUpChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-1 animate-fade-up">
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={() => onChipClick(chip)}
          className="px-3 py-1.5 text-xs rounded-full border border-surface-border bg-surface-raised
                     text-text-secondary hover:border-accent/40 hover:text-text-primary
                     transition-colors cursor-pointer"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
