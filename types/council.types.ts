export type CouncilRole = 'advocate' | 'critic' | 'moderator' | 'questioner' | 'default';
export type CouncilMode = 'open' | 'structured_debate';

export interface MemberAttributes {
  focusArea?: string;
  tone?: 'direct' | 'gentle' | 'challenging' | 'default';
  context?: string;
}

export interface CouncilMember {
  personaId: string;
  role: CouncilRole;
  attributes?: MemberAttributes;
}

export interface CouncilRoom {
  id: string;
  user_id: string;
  title: string | null;
  topic: string | null;
  members: CouncilMember[];
  mode: CouncilMode;
  created_at: string;
  updated_at: string;
}

export interface PersonaResponse {
  response: string;
  role: CouncilRole;
}

/** A single speaking turn in the dynamic conversation */
export interface ConversationTurn {
  turnIndex: number;
  personaId: string;
  role: CouncilRole;
  phase: "initial" | "reaction" | "introduction";
  response: string;
  // Track why this person is speaking
  userRequestedSpeaker?: boolean; // True if user hand-raised them
  speakerSource?: 'user' | 'director' | 'system'; // Who decided this speaker
}

/** AI Director decision — who speaks next? */
export interface DirectorDecision {
  nextSpeaker: string;
  instruction: string;
  shouldContinue: boolean;
}

export interface SessionArtifact {
  cameInWith: string;
  walkingOutWith: string;
  keyDecision: string;
}

export interface CouncilMessage {
  id: string;
  council_room_id: string;
  user_prompt: string;
  persona_responses: Record<string, PersonaResponse>;
  moderator_output: string | null;
  auto_summary: string | null;
  created_at: string;
  // Dynamic conversation turns (null for legacy messages)
  conversation_turns?: ConversationTurn[] | null;
  // Streaming state (transient — not persisted)
  streamingPersonaId?: string;
  streamingModeratorId?: string;
  suggestedChips?: string[];
  currentPhase?: "introduction" | "initial" | "reaction" | "wrap-up";
  // End-of-session clarity artifact
  sessionArtifact?: SessionArtifact;
}

// SSE event types emitted by /api/council during streaming
export type SSEEvent =
  | { type: "persona_start"; personaId: string; role: CouncilRole }
  | { type: "persona_thinking"; personaId: string } // Signals persona is thinking (UI shows "X is thinking...")
  | { type: "token"; personaId: string; text: string }
  | { type: "persona_done"; personaId: string; fullResponse: string; role: CouncilRole; pauseAfterMs?: number }
  | { type: "moderator_start"; personaId: string }
  | { type: "moderator_token"; text: string }
  | { type: "moderator_done"; output: string }
  | { type: "summary_done"; summary: string }
  | { type: "chips"; questions: string[] }
  | { type: "session_artifact"; artifact: SessionArtifact }
  | { type: "done"; councilMessageId: string | null }
  | { type: "error"; message: string }
  | { type: "turn_done"; turnIndex: number; personaId: string; fullResponse: string; role: CouncilRole; phase: string; userRequestedSpeaker?: boolean; speakerSource?: 'user' | 'director' | 'system' }
  | { type: "phase_change"; phase: "initial" | "reaction" | "wrap-up" | "introduction" };

export interface RecommendedCouncil {
  id: string;
  title: string;
  topic: string;
  description: string;
  members: CouncilMember[];
  sampleQuestion: string;
  tags: string[];
}

export interface CouncilAPIResponse {
  councilMessageId: string;
  responses: Record<string, PersonaResponse>;
  moderatorOutput: string | null;
  autoSummary: string | null;
}
