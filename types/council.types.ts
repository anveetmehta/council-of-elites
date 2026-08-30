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

/** Conversational move classification, produced by classifyMove after a reaction/handoff turn */
export type MoveType = "PROPOSAL" | "CHALLENGE" | "QUESTION" | "BUILD" | "BRIDGE" | "CONCESSION" | "REFRAME" | "OBSERVATION";

/** A single speaking turn in the dynamic conversation */
export interface ConversationTurn {
  turnIndex: number;
  personaId: string;
  role: CouncilRole;
  phase: "scoping" | "initial" | "reaction" | "introduction";
  response: string;
  // Track why this person is speaking
  userRequestedSpeaker?: boolean; // True if user hand-raised them
  speakerSource?: 'user' | 'director' | 'system'; // Who decided this speaker
  // Marks this reaction turn as the "ball back to user" turn
  isHandoff?: boolean;
  // Move classification, attached right after this turn completes (reaction/handoff turns only)
  moveType?: MoveType;
  addressedTo?: string | null;
  // Set when this turn's instruction was steered by a mid-round user interjection
  userInterjection?: string;
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

/** Persisted round status — a round starts 'in_progress' and is updated incrementally per turn */
export type RoundStatus = 'in_progress' | 'completed' | 'failed';

/** Everything the turn-by-turn engine needs to resume a round, beyond the turns already persisted */
export interface RoundState {
  phase: "scoping" | "initial" | "reaction" | "wrapup";
  question: string;
  members: CouncilMember[];
  userSelectedSpeakerId?: string;
  stances: Record<string, string>;
  scoperPersonaId: string | null;
  phase1MemberIds: string[];
  phase1Index: number;
  conductorReactionOrder: string[];
  reactionSetupDone: boolean;
  reactionPathology: string; // ConversationPathology, kept as string to avoid a conductor.ts type dependency here
  userSelectionUsed: boolean;
  reactionCountsLocal: Record<string, number>;
  reactionsCompleted: number;
  // Snapshotted once at round start — deliberately NOT re-fetched per turn, so every
  // turn in this round sees the same prior-context the round began with.
  recentRounds: Array<{ question: string; responses: Array<{ name: string; role: string; response: string }>; summary?: string }>;
  conversationSummary?: string;
  roomTitleMissing: boolean;
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
  // Turn-by-turn round bookkeeping (absent/'completed' for legacy rows)
  status?: RoundStatus;
  round_state?: RoundState | null;
  // Streaming state (transient — not persisted)
  streamingPersonaId?: string;
  streamingModeratorId?: string;
  suggestedChips?: string[];
  currentPhase?: "scoping" | "introduction" | "initial" | "reaction" | "wrap-up";
  // End-of-session clarity artifact
  sessionArtifact?: SessionArtifact;
  // Memory counts per persona (how many memories they have of this user)
  personaMemoryCounts?: Record<string, number>;
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
  | { type: "persona_memories"; counts: Record<string, number> }
  | { type: "speakers_selected"; phasePersonaIds: string[] } // Conductor selection for phase — tells UI which personas to expect
  | { type: "done"; councilMessageId: string | null }
  | { type: "error"; message: string }
  | { type: "turn_done"; turnIndex: number; personaId: string; fullResponse: string; role: CouncilRole; phase: string; userRequestedSpeaker?: boolean; speakerSource?: 'user' | 'director' | 'system'; isHandoff?: boolean; moveType?: MoveType; addressedTo?: string | null; userInterjection?: string }
  | { type: "phase_change"; phase: "scoping" | "initial" | "reaction" | "wrap-up" | "introduction" }
  // Marks the end of one /api/council/next-turn call. roundComplete=false means
  // the client should immediately call next-turn again (picking up any queued
  // interjection); true means the round is fully wrapped up and persisted.
  | { type: "round_step_done"; roundComplete: boolean; councilMessageId: string };

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
