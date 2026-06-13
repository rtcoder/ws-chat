const {boolean, index, pgTable, primaryKey, text, timestamp, uuid} = require('drizzle-orm/pg-core');
const {sql} = require('drizzle-orm');

const timestamps = {
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
};

const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  avatar: text('avatar'),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  ...timestamps,
});

const chats = pgTable('chats', {
  id: uuid('id').primaryKey(),
  name: text('name'),
  image: text('image'),
  ownerId: uuid('owner_id').references(() => users.id, {onDelete: 'set null'}),
  msgColor: text('msg_color'),
  fontColor: text('font_color'),
  background: text('background').notNull().default('#fff'),
  ...timestamps,
});

const chatMembers = pgTable('chat_members', {
  chatId: uuid('chat_id').notNull().references(() => chats.id, {onDelete: 'cascade'}),
  userId: uuid('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
}, (table) => [
  primaryKey({columns: [table.chatId, table.userId]}),
]);

const messages = pgTable('messages', {
  id: uuid('id').primaryKey(),
  text: text('text'),
  images: text('images').array().notNull().default(sql`'{}'::text[]`),
  authorId: uuid('author_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
  relatedUserId: uuid('related_user_id').references(() => users.id, {onDelete: 'set null'}),
  replyToId: uuid('reply_to_id').references(() => messages.id, {onDelete: 'set null'}),
  type: text('type').notNull().default('msg'),
  isSpoiler: boolean('is_spoiler').notNull().default(false),
  isOnlyEmoji: boolean('is_only_emoji').notNull().default(false),
  chatId: uuid('chat_id').references(() => chats.id, {onDelete: 'cascade'}),
  ...timestamps,
}, (table) => [
  index('messages_created_at_idx').on(table.createdAt),
  index('messages_chat_created_at_idx').on(table.chatId, table.createdAt),
  index('messages_author_created_at_idx').on(table.authorId, table.createdAt),
]);

const messageReactions = pgTable('message_reactions', {
  messageId: uuid('message_id').notNull().references(() => messages.id, {onDelete: 'cascade'}),
  userId: uuid('user_id').notNull().references(() => users.id, {onDelete: 'cascade'}),
  type: text('type').notNull(),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
}, (table) => [
  primaryKey({columns: [table.messageId, table.userId, table.type]}),
]);

const images = pgTable('images', {
  id: uuid('id').primaryKey(),
  path: text('path').notNull(),
  authorId: uuid('author_id').references(() => users.id, {onDelete: 'set null'}),
  chatId: uuid('chat_id').references(() => chats.id, {onDelete: 'cascade'}),
  ...timestamps,
});

module.exports = {
  chatMembers,
  chats,
  images,
  messageReactions,
  messages,
  users,
};
