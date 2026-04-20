"use client";

import { useEffect, useState } from "react";
import { PersonaDefinition } from "@/types/persona.types";
import { X, Shield } from "lucide-react";
import { trackEvent, Events } from "@/lib/analytics";

const STORAGE_KEY = "council_disclaimer_seen";

interface DisclaimerModalProps {
  personas: PersonaDefinition[];
}

export function DisclaimerModal({ personas }: DisclaimerModalProps) {
  const [show, setShow] = useState(false);

  const hasDomainExperts = personas.some((p) => p.personaType === "domain_expert");

  useEffect(() => {
    if (!hasDomainExperts) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setShow(true);
      trackEvent(Events.DISCLAIMER_SEEN);
    }
  }, [hasDomainExperts]);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-raised p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-800/30 flex items-center justify-center">
              <Shield size={15} className="text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-text-primary">
              About AI-Inspired Perspectives
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs text-text-secondary leading-relaxed mb-6">
          <p>
            Your council includes one or more <strong className="text-text-primary">AI-Inspired Perspectives</strong> — advisory voices based on real people&apos;s publicly available writings, essays, interviews, and documented views.
          </p>
          <p>
            These are <strong className="text-text-primary">AI-generated</strong> based solely on public materials. They are not affiliated with, endorsed by, or representative of the individuals named. The responses do not reflect private views, unpublished opinions, or the individuals&apos; current thinking.
          </p>
          <p>
            Responses are for <strong className="text-text-primary">educational and reflective purposes only</strong> and do not constitute legal, financial, medical, or professional advice.
          </p>
        </div>

        <button
          onClick={handleClose}
          className="w-full py-2.5 px-4 rounded-lg bg-accent hover:bg-accent-hover transition-colors text-sm font-medium text-white"
        >
          I understand — continue
        </button>

        <p className="mt-3 text-[10px] text-text-muted text-center">
          You won&apos;t see this again in this browser.{" "}
          <a href="/terms" className="underline hover:text-text-secondary">
            Terms of Service
          </a>
        </p>
      </div>
    </div>
  );
}
