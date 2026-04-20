CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- PERSONAS: public read-only catalog
-- =====================
CREATE TABLE personas (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  tagline             TEXT NOT NULL,
  archetype           TEXT NOT NULL,
  color_hex           TEXT NOT NULL DEFAULT '#6B7280',
  persona_type        TEXT NOT NULL DEFAULT 'archetype'
                        CHECK (persona_type IN ('archetype', 'domain_expert')),
  disclaimer_text     TEXT,
  source_attribution  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personas are publicly readable"
  ON personas FOR SELECT USING (true);

-- =====================
-- COUNCIL ROOMS
-- members JSONB: [{ personaId, role, attributes: { focusArea, tone, context } }]
-- =====================
CREATE TABLE council_rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,
  topic       TEXT,
  members     JSONB NOT NULL DEFAULT '[]',
  mode        TEXT NOT NULL DEFAULT 'open'
                CHECK (mode IN ('open', 'structured_debate')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE council_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own council rooms"
  ON council_rooms FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_council_rooms_user ON council_rooms(user_id);
CREATE INDEX idx_council_rooms_updated ON council_rooms(updated_at DESC);

-- =====================
-- COUNCIL MESSAGES
-- persona_responses JSONB: { personaId: { response: text, role: string } }
-- =====================
CREATE TABLE council_messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  council_room_id  UUID NOT NULL REFERENCES council_rooms(id) ON DELETE CASCADE,
  user_prompt      TEXT NOT NULL,
  persona_responses JSONB NOT NULL DEFAULT '{}',
  moderator_output TEXT,
  auto_summary     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE council_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access messages in their council rooms"
  ON council_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM council_rooms r
      WHERE r.id = council_messages.council_room_id
        AND r.user_id = auth.uid()
    )
  );
CREATE INDEX idx_council_messages_room ON council_messages(council_room_id);
CREATE INDEX idx_council_messages_created ON council_messages(created_at ASC);

-- =====================
-- FEEDBACK
-- =====================
CREATE TABLE feedback (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  council_message_id UUID NOT NULL REFERENCES council_messages(id) ON DELETE CASCADE,
  persona_id         TEXT,
  rating             SMALLINT CHECK (rating IN (1, -1)),
  comment            TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own feedback"
  ON feedback FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_message ON feedback(council_message_id);

-- =====================
-- ANALYTICS EVENTS
-- =====================
CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name  TEXT NOT NULL,
  properties  JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- AUTO-UPDATE updated_at
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER council_rooms_updated_at
  BEFORE UPDATE ON council_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
