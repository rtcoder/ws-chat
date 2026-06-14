const {randomUUID} = require('crypto');
const {and, desc, eq, inArray, ne, sql} = require('drizzle-orm');
const {db} = require('../db');
const {chatMembers, chats, messages, users} = require('../schema');

const CHAT_TYPES = {
  CHANNEL: 'channel',
  DIRECT: 'direct',
  GROUP: 'group',
};

const GENERAL_CHAT_KEY = 'general';

const buildDirectChatKey = (leftUserId, rightUserId) => [leftUserId, rightUserId]
  .sort()
  .join(':');

const getChatByField = async (field, value) => {
  const [chat] = await db
    .select()
    .from(chats)
    .where(eq(field, value))
    .limit(1);

  return chat || null;
};

const ensureMembers = async (chatId, userIds) => {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (!uniqueUserIds.length) {
    return;
  }

  const existingMembers = await db
    .select({userId: chatMembers.userId})
    .from(chatMembers)
    .where(and(
      eq(chatMembers.chatId, chatId),
      inArray(chatMembers.userId, uniqueUserIds),
    ));

  const existingUserIds = new Set(existingMembers.map(({userId}) => userId));
  const missingUserIds = uniqueUserIds.filter((userId) => !existingUserIds.has(userId));

  if (!missingUserIds.length) {
    return;
  }

  await db.insert(chatMembers).values(missingUserIds.map((userId) => ({
    chatId,
    userId,
  })));
};

const ensureGeneralChat = async () => {
  let generalChat = await getChatByField(chats.systemKey, GENERAL_CHAT_KEY);

  if (!generalChat) {
    const [createdChat] = await db
      .insert(chats)
      .values({
        id: randomUUID(),
        type: CHAT_TYPES.CHANNEL,
        systemKey: GENERAL_CHAT_KEY,
        name: 'General room',
      })
      .returning();

    generalChat = createdChat;
  }

  const allUsers = await db
    .select({userId: users.id})
    .from(users);

  await ensureMembers(generalChat.id, allUsers.map(({userId}) => userId));
  return generalChat;
};

const ensureUserInGeneralChat = async (userId) => {
  const generalChat = await ensureGeneralChat();
  await ensureMembers(generalChat.id, [userId]);
  return generalChat;
};

const getGeneralChatForUser = async (userId) => {
  const generalChat = await ensureGeneralChat();
  const membership = await db
    .select({chatId: chatMembers.chatId})
    .from(chatMembers)
    .where(and(
      eq(chatMembers.chatId, generalChat.id),
      eq(chatMembers.userId, userId),
    ))
    .limit(1);

  if (membership.length) {
    return generalChat;
  }

  await ensureMembers(generalChat.id, [userId]);
  return generalChat;
};

const isUserChatMember = async (chatId, userId) => {
  const [membership] = await db
    .select({chatId: chatMembers.chatId})
    .from(chatMembers)
    .where(and(
      eq(chatMembers.chatId, chatId),
      eq(chatMembers.userId, userId),
    ))
    .limit(1);

  return Boolean(membership);
};

const getChatByIdForUser = async (chatId, userId) => {
  const [chat] = await db
    .select({chat: chats})
    .from(chats)
    .innerJoin(chatMembers, and(
      eq(chatMembers.chatId, chats.id),
      eq(chatMembers.userId, userId),
    ))
    .where(eq(chats.id, chatId))
    .limit(1);

  return chat?.chat || null;
};

const getChatUserIds = async (chatId) => {
  const rows = await db
    .select({userId: chatMembers.userId})
    .from(chatMembers)
    .where(eq(chatMembers.chatId, chatId));

  return rows.map(({userId}) => userId);
};

const touchChat = async (chatId) => {
  await db
    .update(chats)
    .set({updatedAt: sql`now()`})
    .where(eq(chats.id, chatId));
};

const getOrCreateDirectChat = async (userId, otherUserId) => {
  if (!otherUserId || userId === otherUserId) {
    throw new Error('Direct chat requires two distinct users');
  }

  const [otherUser] = await db
    .select({id: users.id})
    .from(users)
    .where(eq(users.id, otherUserId))
    .limit(1);

  if (!otherUser) {
    return null;
  }

  const directKey = buildDirectChatKey(userId, otherUserId);
  let directChat = await getChatByField(chats.directKey, directKey);

  if (!directChat) {
    const [createdChat] = await db
      .insert(chats)
      .values({
        id: randomUUID(),
        type: CHAT_TYPES.DIRECT,
        directKey,
      })
      .returning();

    directChat = createdChat;
  }

  await ensureMembers(directChat.id, [userId, otherUserId]);
  return directChat;
};

const listChatsForUser = async (userId) => {
  const chatRows = await db
    .select({chat: chats})
    .from(chats)
    .innerJoin(chatMembers, and(
      eq(chatMembers.chatId, chats.id),
      eq(chatMembers.userId, userId),
    ))
    .orderBy(desc(chats.updatedAt));

  const accessibleChats = chatRows.map(({chat}) => chat);

  if (!accessibleChats.length) {
    return [];
  }

  const chatIds = accessibleChats.map((chat) => chat.id);
  const memberRows = await db
    .select({
      chatId: chatMembers.chatId,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
      },
    })
    .from(chatMembers)
    .innerJoin(users, eq(users.id, chatMembers.userId))
    .where(inArray(chatMembers.chatId, chatIds));

  const latestMessageRows = await db
    .select({
      chatId: messages.chatId,
      text: messages.text,
      createdAt: messages.createdAt,
      authorId: messages.authorId,
      media: messages.media,
      images: messages.images,
    })
    .from(messages)
    .where(inArray(messages.chatId, chatIds))
    .orderBy(desc(messages.createdAt));

  const latestMessageByChatId = new Map();
  latestMessageRows.forEach((message) => {
    if (!latestMessageByChatId.has(message.chatId)) {
      latestMessageByChatId.set(message.chatId, message);
    }
  });

  const membersByChatId = memberRows.reduce((acc, row) => {
    if (!acc.has(row.chatId)) {
      acc.set(row.chatId, []);
    }

    acc.get(row.chatId).push(row.user);
    return acc;
  }, new Map());

  return accessibleChats.map((chat) => {
    const members = membersByChatId.get(chat.id) || [];
    const otherMember = chat.type === CHAT_TYPES.DIRECT
      ? members.find((member) => member.id !== userId) || null
      : null;
    const latestMessage = latestMessageByChatId.get(chat.id) || null;

    return {
      id: chat.id,
      type: chat.type,
      systemKey: chat.systemKey,
      name: chat.type === CHAT_TYPES.DIRECT
        ? (otherMember ? [otherMember.firstName, otherMember.lastName].filter(Boolean).join(' ') : 'Direct chat')
        : (chat.name || 'Untitled chat'),
      image: chat.type === CHAT_TYPES.DIRECT ? otherMember?.avatar || null : chat.image || null,
      members: members.map((member) => ({
        _id: member.id,
        first_name: member.firstName,
        last_name: member.lastName,
        avatar: member.avatar,
      })),
      latestMessage: latestMessage
        ? {
          text: latestMessage.text,
          createdAt: latestMessage.createdAt,
          authorId: latestMessage.authorId,
          mediaCount: Array.isArray(latestMessage.media) ? latestMessage.media.length : (latestMessage.images?.length || 0),
        }
        : null,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  });
};

module.exports = {
  CHAT_TYPES,
  GENERAL_CHAT_KEY,
  buildDirectChatKey,
  ensureGeneralChat,
  ensureUserInGeneralChat,
  getChatByIdForUser,
  getChatUserIds,
  getGeneralChatForUser,
  getOrCreateDirectChat,
  isUserChatMember,
  listChatsForUser,
  touchChat,
};
