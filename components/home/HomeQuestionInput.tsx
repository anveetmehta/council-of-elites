"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Loader2 } from "lucide-react";

export function HomeQuestionInput() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    router.push(`/council/new?topic=${encodeURIComponent(trimmed)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-xl border border-surface-border bg-surface-raised focus-within:border-accent/40 transition-colors overflow-hidden">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="A decision, a dilemma, something you've been turning over..."
          rows={2}
          autoFocus
          className="w-full px-4 pt-4 pb-2 bg-transparent text-base text-text-primary placeholder:text-text-muted focus:outline-none leading-relaxed resize-none min-h-[64px]"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-surface-border bg-surface-overlay/30">
          <p className="text-[11px] text-text-muted">
            Enter to send · Shift+Enter for new line
          </p>
          <button
            type="submit"
            disabled={!value.trim() || submitting}
            className="p-1.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 size={14} className="text-white animate-spin" />
            ) : (
              <ArrowUp size={14} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
