"use client";

import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
  });
}

export function identifyUser(userId: string, email?: string) {
  posthog.identify(userId, { email });
}

export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
) {
  posthog.capture(eventName, properties);
}

export const Events = {
  USER_SIGNED_UP: "user_signed_up",
  COUNCIL_CREATED: "council_created",
  COUNCIL_QUESTION_ASKED: "council_question_asked",
  RECOMMENDED_COUNCIL_USED: "recommended_council_used",
  DOMAIN_EXPERT_USED: "domain_expert_used",
  ROLE_ASSIGNED: "role_assigned",
  FEEDBACK_SUBMITTED: "feedback_submitted",
  DISCLAIMER_SEEN: "disclaimer_seen",
} as const;
