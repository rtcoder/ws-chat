const {randomUUID} = require('crypto');
const {and, asc, desc, eq, inArray, or} = require('drizzle-orm');
const {db} = require('../db');
const {images, messageReactions, messages, users} = require('../schema');

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

const normalizeMedia = (message) => {
  if (Array.isArray(message.media) && message.media.length) {
    return message.media;
  }

  return (message.images || []).map((path) => ({
    path,
    kind: 'image',
    name: path.split('/').pop() || null,
    poster: path,
    mimeType: null,
    waveform: null,
    duration: null,
  }));
};

const toMessage = ({message, author, reactions}) => ({
  _id: message.id,
  text: message.text,
  media: normalizeMedia(message),
  images: message.images || [],
  author: {
    _id: author.id,
    first_name: author.firstName,
    last_name: author.lastName,
    avatar: author.avatar,
  },
  relatedUser: message.relatedUserId || null,
  reactions,
  replyTo: message.replyToId || null,
  type: message.type,
  isSpoiler: message.isSpoiler,
  isOnlyEmoji: message.isOnlyEmoji,
  chatId: message.chatId || null,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const mapRowsToMessages = (rows) => {
  const messagesById = new Map();

  rows.forEach((row) => {
    if (!messagesById.has(row.message.id)) {
      messagesById.set(row.message.id, {
        message: row.message,
        author: row.author,
        reactions: [],
      });
    }

    if (row.reaction?.userId) {
      messagesById.get(row.message.id).reactions.push({
        user: row.reaction.userId,
        type: row.reaction.type,
      });
    }
  });

  return [...messagesById.values()].map(toMessage);
};

const selectMessagesWithAuthors = () => db
  .select({
    message: messages,
    author: {
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      avatar: users.avatar,
    },
    reaction: {
      userId: messageReactions.userId,
      type: messageReactions.type,
    },
  })
  .from(messages)
  .innerJoin(users, eq(users.id, messages.authorId))
  .leftJoin(messageReactions, eq(messageReactions.messageId, messages.id));

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

  await db.insert(messages).values({
    id,
    text: data.text || '',
    media: data.media || [],
    images: data.images || [],
    authorId: data.user_id,
    relatedUserId: data.relatedUser || null,
    replyToId: data.replyTo || null,
    type: data.type || MESSAGE_TYPES.MESSAGE,
    isSpoiler: Boolean(data.isSpoiler),
    isOnlyEmoji,
    chatId: data.chatId || null,
  });

  const message = await getMessageWithAuthor(id);
  afterSave(message);
  return message;
};

const getMessageWithAuthor = async (id) => {
  const rows = await selectMessagesWithAuthors()
    .where(eq(messages.id, id));

  return mapRowsToMessages(rows)[0] || null;
};

const getLatestMessages = async (limit = 30) => {
  const latestRows = await db
    .select({id: messages.id})
    .from(messages)
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  const ids = latestRows.map(({id}) => id).reverse();

  if (!ids.length) {
    return [];
  }

  const rows = await selectMessagesWithAuthors()
    .where(inArray(messages.id, ids))
    .orderBy(asc(messages.createdAt));

  return mapRowsToMessages(rows);
};

const deleteMessage = async (messageId, userId) => {
  const existingMessage = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });

  if (!existingMessage) {
    return {status: 'not_found'};
  }

  if (existingMessage.authorId !== userId) {
    return {status: 'forbidden'};
  }

  const mediaItems = normalizeMedia(existingMessage);
  const filePaths = mediaItems.flatMap((media) => [media.path, media.poster].filter(Boolean));

  if (filePaths.length) {
    await db.delete(images)
      .where(or(
        inArray(images.path, filePaths),
        inArray(images.posterPath, filePaths),
      ));
  }

  await db.delete(messages)
    .where(and(
      eq(messages.id, messageId),
      eq(messages.authorId, userId),
    ));

  return {
    status: 'deleted',
    messageId,
    mediaItems,
  };
};

module.exports = {
  MESSAGE_TYPES,
  createMessage,
  deleteMessage,
  getLatestMessages,
  getMessageWithAuthor,
};
