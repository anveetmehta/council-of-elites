-- Add conversation_turns column for dynamic multi-turn conversations
-- Stores ordered ConversationTurn[] array alongside existing persona_responses
-- NULL for legacy messages (backward compatible)
ALTER TABLE council_messages
  ADD COLUMN IF NOT EXISTS conversation_turns JSONB DEFAULT NULL;
