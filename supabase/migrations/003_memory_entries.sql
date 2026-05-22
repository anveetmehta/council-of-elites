-- =====================
-- MEMORY ENTRIES
-- Persona observations and reflections about users, accumulated across sessions.
-- Keyed by (user_id, persona_id) so memories follow personas across councils.
-- =====================

CREATE TABLE memory_entries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  council_room_id   UUID REFERENCES council_rooms(id) ON DELETE SET NULL,
  persona_id        TEXT NOT NULL,
  content           TEXT NOT NULL,
  importance        SMALLINT NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  memory_type       TEXT NOT NULL DEFAULT 'observation'
                      CHECK (memory_type IN ('observation', 'reflection')),
  source_message_id UUID REFERENCES council_messages(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE memory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own memories"
  ON memory_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Primary lookup: all memories for a (user, persona) pair
CREATE INDEX idx_memory_entries_user_persona
  ON memory_entries(user_id, persona_id);

-- For recency + importance sorting
CREATE INDEX idx_memory_entries_importance
  ON memory_entries(user_id, persona_id, importance DESC, created_at DESC);

-- Count observations quickly (for reflection trigger)
CREATE INDEX idx_memory_entries_type
  ON memory_entries(user_id, persona_id, memory_type);
