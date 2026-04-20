"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent, Events } from "@/lib/analytics";

interface FeedbackFormProps {
  councilMessageId: string;
}

export function FeedbackForm({ councilMessageId }: FeedbackFormProps) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showComment, setShowComment] = useState(false);

  async function handleRate(value: 1 | -1) {
    setRating(value);
    setShowComment(true);

    // Submit immediately on rating, comment is optional
    await submitFeedback(value, "");
  }

  async function submitFeedback(r: 1 | -1, c: string) {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          councilMessageId,
          rating: r,
          comment: c || undefined,
        }),
      });

      trackEvent(Events.FEEDBACK_SUBMITTED, {
        rating: r,
        hasComment: !!c,
        scope: "session",
      });
    } catch {}
  }

  async function handleSubmitComment() {
    if (!rating || !comment.trim()) return;
    await submitFeedback(rating, comment);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="text-xs text-text-muted text-center py-2">
        Thanks for the feedback.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {!showComment ? (
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">Was this helpful?</span>
          <button
            onClick={() => handleRate(1)}
            className="p-1.5 rounded-lg border border-surface-border hover:border-role-advocate hover:text-role-advocate text-text-muted transition-colors"
          >
            <ThumbsUp size={13} />
          </button>
          <button
            onClick={() => handleRate(-1)}
            className="p-1.5 rounded-lg border border-surface-border hover:border-role-critic hover:text-role-critic text-text-muted transition-colors"
          >
            <ThumbsDown size={13} />
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 text-xs",
              rating === 1 ? "text-role-advocate" : "text-role-critic"
            )}>
              {rating === 1 ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
              <span>{rating === 1 ? "Helpful" : "Not helpful"}</span>
            </div>
            <span className="text-xs text-text-muted">— What would make it better? (optional)</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              onKeyDown={(e) => e.key === "Enter" && handleSubmitComment()}
              className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-surface-raised border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
            />
            <button
              onClick={handleSubmitComment}
              className="px-3 py-1.5 rounded-lg text-xs bg-surface-overlay border border-surface-border text-text-secondary hover:text-text-primary transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
