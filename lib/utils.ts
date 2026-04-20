import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CouncilRole } from "@/types/council.types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getRoleBadgeConfig(role: CouncilRole): {
  label: string;
  className: string;
} {
  switch (role) {
    case "advocate":
      return {
        label: "FOR",
        className:
          "bg-role-advocate-bg border-role-advocate-border text-role-advocate",
      };
    case "critic":
      return {
        label: "AGAINST",
        className:
          "bg-role-critic-bg border-role-critic-border text-role-critic",
      };
    case "moderator":
      return {
        label: "MODERATOR",
        className:
          "bg-role-moderator-bg border-role-moderator-border text-role-moderator",
      };
    case "questioner":
      return {
        label: "QUESTIONS",
        className:
          "bg-role-questioner-bg border-role-questioner-border text-role-questioner",
      };
    default:
      return {
        label: "OPEN",
        className: "bg-surface-overlay border-surface-border text-text-secondary",
      };
  }
}

export function getRoleLeftBorderClass(role: CouncilRole): string {
  switch (role) {
    case "advocate":
      return "border-l-role-advocate";
    case "critic":
      return "border-l-role-critic";
    case "moderator":
      return "border-l-role-moderator";
    case "questioner":
      return "border-l-role-questioner";
    default:
      return "";
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength).trimEnd() + "…";
}

// Extract @handle from beginning of a question: "@Naval should I..." → "Naval"
export function extractMentionHandle(question: string): string | null {
  const match = question.match(/^@(\w+)\s/);
  return match ? match[1] : null;
}

// Convert a persona name to its @mention handle (first meaningful word)
// "The Naval Perspective" → "Naval"   "The Sharp Contrarian" → "Sharp"
export function getPersonaHandle(name: string): string {
  return name
    .replace(/^The\s+/i, "")
    .replace(/\s+Perspective$/i, "")
    .split(/\s+/)[0];
}
