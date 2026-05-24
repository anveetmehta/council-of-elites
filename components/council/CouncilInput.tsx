"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square, AtSign } from "lucide-react";
import { CouncilMember } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { getPersonaHandle } from "@/lib/utils";

const MENTION_HINT_KEY = "council_mention_hint_seen";

interface CouncilInputProps {
  onSubmit: (question: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  members?: CouncilMember[];
  initialValue?: string;
  onInitialValueConsumed?: () => void;
  focusRing?: boolean; // Accent ring + glow to signal "your turn"
}

export function CouncilInput({
  onSubmit,
  onStop,
  disabled,
  placeholder,
  members,
  initialValue,
  onInitialValueConsumed,
  focusRing = false,
}: CouncilInputProps) {
  const [value, setValue] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentionHint, setShowMentionHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if user has seen the @mention hint before
  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem(MENTION_HINT_KEY);
    if (!seen && members && members.length > 1) {
      // Will show on first focus
    }
  }, [members]);

  // Consume initialValue (e.g. from follow-up chip click)
  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
      onInitialValueConsumed?.();
      setTimeout(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.selectionStart = el.selectionEnd = el.value.length;
        }
      }, 0);
    }
  }, [initialValue, onInitialValueConsumed]);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  // Build filtered member list for @mention dropdown
  const filteredMembers =
    mentionQuery !== null && members
      ? members.filter((m) => {
          const persona = getPersonaById(m.personaId) || getDomainExpertById(m.personaId);
          if (!persona) return false;
          const handle = getPersonaHandle(persona.name);
          return handle.toLowerCase().startsWith(mentionQuery.toLowerCase());
        })
      : [];

  function handleFocus() {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(MENTION_HINT_KEY);
    if (!seen && members && members.length > 1) {
      hintTimerRef.current = setTimeout(() => {
        setShowMentionHint(true);
        localStorage.setItem(MENTION_HINT_KEY, "1");
        // Auto-dismiss after 4s
        setTimeout(() => setShowMentionHint(false), 4000);
      }, 600);
    }
  }

  function handleBlur() {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setTimeout(() => setShowMentionHint(false), 200);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    setValue(newValue);
    // Dismiss hint when user starts typing
    if (newValue.length > 0) setShowMentionHint(false);

    // Only detect @mention at the very start of the message
    const atMatch = newValue.match(/^@(\w*)$/);
    setMentionQuery(atMatch ? atMatch[1] : null);
  }

  function selectMention(member: CouncilMember) {
    const persona = getPersonaById(member.personaId) || getDomainExpertById(member.personaId);
    if (!persona) return;
    const handle = getPersonaHandle(persona.name);
    setValue(`@${handle} `);
    setMentionQuery(null);
    textareaRef.current?.focus();
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    setMentionQuery(null);
    onSubmit(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && mentionQuery !== null) {
      setMentionQuery(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const showMentionDropdown = mentionQuery !== null && filteredMembers.length > 0;

  return (
    <div className="border-t border-surface-border bg-surface px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          {/* @mention hint tooltip (first-time) */}
          {showMentionHint && (
            <div className="absolute bottom-full mb-2 left-0 bg-surface-raised border border-accent/20 rounded-lg px-3 py-2 shadow-lg z-10 animate-fade-up">
              <div className="flex items-center gap-2">
                <AtSign size={12} className="text-accent shrink-0" />
                <p className="text-xs text-text-secondary">
                  Type{" "}
                  <span className="font-mono text-accent">@Name</span>{" "}
                  to speak directly with one advisor
                </p>
              </div>
              <div className="absolute bottom-[-5px] left-4 w-2.5 h-2.5 bg-surface-raised border-r border-b border-accent/20 rotate-45" />
            </div>
          )}

          {/* @mention dropdown */}
          {showMentionDropdown && (
            <div className="absolute bottom-full mb-1 left-0 bg-surface-raised border border-surface-border rounded-xl overflow-hidden shadow-lg z-10 min-w-[200px]">
              {filteredMembers.map((m) => {
                const persona =
                  getPersonaById(m.personaId) || getDomainExpertById(m.personaId);
                if (!persona) return null;
                const handle = getPersonaHandle(persona.name);
                return (
                  <button
                    key={m.personaId}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectMention(m);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-overlay w-full text-left transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: persona.colorHex }}
                    />
                    <span className="text-sm font-medium text-text-primary">
                      @{handle}
                    </span>
                    <span className="text-xs text-text-muted truncate">
                      {persona.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div
            className={
              focusRing
                ? "flex items-end gap-3 rounded-xl border border-accent/40 bg-surface-raised px-4 py-3 focus-within:border-accent/60 ring-1 ring-accent/20 transition-colors"
                : "flex items-end gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3 focus-within:border-accent/40 transition-colors"
            }
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder || "Ask your council..."}
              disabled={disabled}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none leading-relaxed min-h-[24px] max-h-40 disabled:opacity-50"
            />
            {disabled && onStop ? (
              <button
                onClick={onStop}
                title="Stop generating"
                className="p-1.5 rounded-lg border border-surface-border hover:border-red-500/40 hover:bg-red-500/10 transition-colors shrink-0 group"
              >
                <Square size={14} className="text-text-muted group-hover:text-red-400 transition-colors" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!value.trim() || disabled}
                className="p-1.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send size={14} className="text-white" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-text-muted text-center">
          Enter to submit · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
