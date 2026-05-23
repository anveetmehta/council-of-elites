"use client";

import { useState } from "react";
import { Copy, Check, ArrowDown } from "lucide-react";
import { SessionArtifact as SessionArtifactType } from "@/types/council.types";

interface SessionArtifactProps {
  artifact: SessionArtifactType;
}

export function SessionArtifact({ artifact }: SessionArtifactProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = `You came in with: ${artifact.cameInWith}\n\nWalking out with: ${artifact.walkingOutWith}\n\nThe question only you can answer: ${artifact.keyDecision}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-accent/30 bg-gradient-to-b from-accent/8 to-transparent overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-accent/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-accent text-xs">✦</span>
          <span className="text-[11px] uppercase tracking-widest font-semibold text-accent">
            Session Clarity
          </span>
        </div>
        <button
          onClick={handleCopy}
          title="Copy to clipboard"
          className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors"
        >
          {copied ? (
            <>
              <Check size={11} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Came in with */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
            You came in with
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            {artifact.cameInWith}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center">
          <ArrowDown size={13} className="text-accent/40" />
        </div>

        {/* Walking out with */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
            Walking out with
          </p>
          <p className="text-sm text-text-primary leading-relaxed font-medium">
            {artifact.walkingOutWith}
          </p>
        </div>

        {/* Key decision */}
        {artifact.keyDecision && (
          <div className="pt-4 border-t border-accent/15">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-text-muted mb-2">
              The question only you can answer
            </p>
            <p className="text-sm text-accent leading-relaxed italic">
              "{artifact.keyDecision}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
