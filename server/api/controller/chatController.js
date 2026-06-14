const {getChatByIdForUser, getOrCreateDirectChat, getGeneralChatForUser, listChatsForUser} = require('../../db/models/chatMethods');
const {getLatestMessages} = require('../../db/models/messageMethods');

const listChats = async (req, res) => {
  try {
    const chats = await listChatsForUser(req.user.user_id);
    return res.json(chats);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};

const getChatMessages = async (req, res) => {
  try {
    const {id} = req.params;
    const userId = req.user.user_id;
    const chat = id === 'general'
      ? await getGeneralChatForUser(userId)
      : await getChatByIdForUser(id, userId);

    if (!chat) {
      return res.status(404).json({message: 'Chat not found'});
    }

    const limit = Number(req.query.limit || 30);
    return res.json(await getLatestMessages({limit, chatId: chat.id}));
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};

const createOrGetDirectChat = async (req, res) => {
  try {
    const {userId} = req.body;
    const chat = await getOrCreateDirectChat(req.user.user_id, userId);

    if (!chat) {
      return res.status(404).json({message: 'Target user not found'});
    }

    const chats = await listChatsForUser(req.user.user_id);
    return res.status(201).json(chats.find((item) => item.id === chat.id) || chat);
  } catch (err) {
    console.error(err);

    if (err.message.includes('distinct users')) {
      return res.status(400).json({message: err.message});
    }

    return res.status(500).send(err);
  }
};

module.exports = {
  createOrGetDirectChat,
  getChatMessages,
  listChats,
};
