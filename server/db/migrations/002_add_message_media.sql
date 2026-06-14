ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE messages
SET media = COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object(
      'path', image_path,
      'kind', CASE
        WHEN image_path ~* '\\.(mp4|webm|ogg|mov|m4v)(\\?.*)?$' THEN 'video'
        ELSE 'image'
      END,
      'poster', CASE
        WHEN image_path ~* '\\.(mp4|webm|ogg|mov|m4v)(\\?.*)?$' THEN NULL
        ELSE image_path
      END,
      'mimeType', NULL
    )
  )
  FROM unnest(COALESCE(messages.images, '{}'::text[])) AS image_path
), '[]'::jsonb)
WHERE media = '[]'::jsonb;

ALTER TABLE images
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'image';

ALTER TABLE images
  ADD COLUMN IF NOT EXISTS poster_path TEXT;
