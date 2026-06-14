ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'group';

ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS system_key TEXT;

ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS direct_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS chats_system_key_unique ON chats (system_key);
CREATE UNIQUE INDEX IF NOT EXISTS chats_direct_key_unique ON chats (direct_key);

UPDATE chats
SET type = COALESCE(NULLIF(type, ''), 'group')
WHERE type IS NULL OR type = '';

INSERT INTO chats (
  id,
  type,
  system_key,
  name,
  background,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'channel',
  'general',
  'General room',
  '#fff',
  now(),
  now()
)
ON CONFLICT (system_key) DO NOTHING;

INSERT INTO chat_members (chat_id, user_id, created_at)
SELECT general_chat.id, users.id, now()
FROM users
CROSS JOIN (
  SELECT id
  FROM chats
  WHERE system_key = 'general'
  LIMIT 1
) AS general_chat
ON CONFLICT (chat_id, user_id) DO NOTHING;

UPDATE messages
SET chat_id = (
  SELECT id
  FROM chats
  WHERE system_key = 'general'
  LIMIT 1
)
WHERE chat_id IS NULL;

UPDATE images
SET chat_id = (
  SELECT id
  FROM chats
  WHERE system_key = 'general'
  LIMIT 1
)
WHERE chat_id IS NULL;

ALTER TABLE messages
  DROP COLUMN IF EXISTS related_user_id;

ALTER TABLE messages
  ALTER COLUMN chat_id SET NOT NULL;
