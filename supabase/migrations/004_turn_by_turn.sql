-- Support turn-by-turn round generation: a round is now created up front as
-- 'in_progress' and updated incrementally as each turn streams, instead of a
-- single insert once everything finishes. Additive/backward-compatible: every
-- existing row defaults to 'completed', matching its current (finished) state.
ALTER TABLE council_messages
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('in_progress', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS round_state JSONB DEFAULT NULL;
