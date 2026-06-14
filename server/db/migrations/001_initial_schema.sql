CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  avatar TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY,
  name TEXT,
  image TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  msg_color TEXT,
  font_color TEXT,
  background TEXT NOT NULL DEFAULT '#fff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  text TEXT,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  images TEXT[] NOT NULL DEFAULT '{}',
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'msg',
  is_spoiler BOOLEAN NOT NULL DEFAULT false,
  is_only_emoji BOOLEAN NOT NULL DEFAULT false,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, type)
);

CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY,
  path TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'image',
  poster_path TEXT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages (created_at);
CREATE INDEX IF NOT EXISTS messages_chat_created_at_idx ON messages (chat_id, created_at);
CREATE INDEX IF NOT EXISTS messages_author_created_at_idx ON messages (author_id, created_at);
