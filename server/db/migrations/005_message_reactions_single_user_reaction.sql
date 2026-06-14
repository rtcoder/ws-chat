DELETE FROM message_reactions current_reaction
USING message_reactions duplicate_reaction
WHERE current_reaction.message_id = duplicate_reaction.message_id
  AND current_reaction.user_id = duplicate_reaction.user_id
  AND (
    current_reaction.created_at < duplicate_reaction.created_at
    OR (
      current_reaction.created_at = duplicate_reaction.created_at
      AND current_reaction.ctid < duplicate_reaction.ctid
    )
  );

ALTER TABLE message_reactions
  DROP CONSTRAINT IF EXISTS message_reactions_pkey;

ALTER TABLE message_reactions
  ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (message_id, user_id);
