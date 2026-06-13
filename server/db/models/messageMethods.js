const {randomUUID} = require('crypto');
const {pgQuery} = require('../db');

const MESSAGE_TYPES = {
  MESSAGE: 'msg',
  REPLY: 'msg_reply',
  INFO_JOIN_MEMBER: 'new_member',
  INFO_LEFT_MEMBER: 'left_member',
  INFO_REMOVE_MEMBER: 'remove_member',
  INFO_CHANGE_BACKGROUND: 'info_change_background',
  INFO_CHANGE_COLOR: 'info_change_color',
  INFO_CHANGE_CHAT_NAME: 'info_change_chat_name',
  INFO_CHANGE_NICKNAME: 'info_change_nickname',
};

const toMessage = row => ({
  _id: row.id,
  text: row.text,
  images: row.images || [],
  author: {
    _id: row.author_id,
    first_name: row.author_first_name,
    last_name: row.author_last_name,
    avatar: row.author_avatar,
  },
  relatedUser: row.related_user_id || null,
  reactions: row.reactions || [],
  replyTo: row.reply_to_id || null,
  type: row.type,
  isSpoiler: row.is_spoiler,
  isOnlyEmoji: row.is_only_emoji,
  chatId: row.chat_id || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const messageSelect = `
  SELECT
    messages.*,
    users.first_name AS author_first_name,
    users.last_name AS author_last_name,
    users.avatar AS author_avatar,
    COALESCE(
      json_agg(
        json_build_object(
          'user', message_reactions.user_id,
          'type', message_reactions.type
        )
      ) FILTER (WHERE message_reactions.user_id IS NOT NULL),
      '[]'
    ) AS reactions
  FROM messages
  JOIN users ON users.id = messages.author_id
  LEFT JOIN message_reactions ON message_reactions.message_id = messages.id
`;

const createMessage = async (
  data,
  afterSave = () => {
  }
) => {
  const ranges = require('../../static/json/emoji-codes.json').join('|');
  const removeEmoji = () => (data.text || '')
    .replace(/\s/g, '')
    .replace(new RegExp(ranges, 'g'), '');
  const emo_test = () => !removeEmoji().length;
  const isOnlyEmoji = emo_test();
  const id = randomUUID();

  await pgQuery(`
    INSERT INTO messages (
      id,
      text,
      images,
      author_id,
      related_user_id,
      reply_to_id,
      type,
      is_spoiler,
      is_only_emoji,
      chat_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    id,
    data.text || '',
    data.images || [],
    data.user_id,
    data.relatedUser || null,
    data.replyTo || null,
    data.type || MESSAGE_TYPES.MESSAGE,
    Boolean(data.isSpoiler),
    isOnlyEmoji,
    data.chatId || null,
  ]);

  const message = await getMessageWithAuthor(id);
  afterSave(message);
  return message;
};

const getMessageWithAuthor = async (id) => {
  const result = await pgQuery(`
    ${messageSelect}
    WHERE messages.id = $1
    GROUP BY messages.id, users.id
  `, [id]);

  return result.rows[0] ? toMessage(result.rows[0]) : null;
};

const getLatestMessages = async (limit = 30) => {
  const result = await pgQuery(`
    SELECT * FROM (
      ${messageSelect}
      GROUP BY messages.id, users.id
      ORDER BY messages.created_at DESC
      LIMIT $1
    ) latest_messages
    ORDER BY latest_messages.created_at ASC
  `, [limit]);

  return result.rows.map(toMessage);
};

module.exports = {
  MESSAGE_TYPES,
  createMessage,
  getLatestMessages,
  getMessageWithAuthor,
};
