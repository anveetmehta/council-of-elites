"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { CouncilMember } from "@/types/council.types";
import { getPersonaById } from "@/data/personas";
import { getDomainExpertById } from "@/data/domain-experts";
import { getPersonaHandle } from "@/lib/utils";

interface CouncilInputProps {
  onSubmit: (question: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
  members?: CouncilMember[];
  initialValue?: string;
  onInitialValueConsumed?: () => void;
}

export function CouncilInput({
  onSubmit,
  onStop,
  disabled,
  placeholder,
  members,
  initialValue,
  onInitialValueConsumed,
}: CouncilInputProps) {
  const [value, setValue] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Consume initialValue (e.g. from follow-up chip click)
  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
      onInitialValueConsumed?.();
      // Focus and place cursor at end
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

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    setValue(newValue);

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
    // Close mention dropdown on Escape
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
                      // Prevent textarea blur before we can update value
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

          <div className="flex items-end gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3 focus-within:border-accent/40 transition-colors">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || "Ask your council... or type @Name to address one member"}
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
          Press Enter to submit · Shift+Enter for new line · @Name to address one member
        </p>
      </div>
    </div>
  );
}
