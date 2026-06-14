const jwt = require("jsonwebtoken");
const {createMessage, getMessageWithAuthor} = require("../db/models/messageMethods");
const {getChatByIdForUser, getChatUserIds, getGeneralChatForUser} = require('../db/models/chatMethods');
const {getConfig} = require("../utils/config");

const getTokenKey = () => process.env.TOKEN_KEY || getConfig().API_SECRET;

const clients = new Map();

const WS_ACTIONS = {
  MESSAGE_ADD: 'message_add',
  MESSAGE_DELETE: 'message_delete',
  REACTION_ADD: 'reaction_add',
};
const decodeMessage = message => {
  return JSON.parse(Buffer.from(message, 'base64').toString('utf8'));
};
const encodeMessage = message => {
  return Buffer.from(JSON.stringify(message), 'utf8').toString('base64');
};

const addClient = (userID, connection) => {
  if (!clients.has(userID)) {
    clients.set(userID, new Set());
  }

  clients.get(userID).add(connection);
};

const removeClient = (userID, connection) => {
  const userConnections = clients.get(userID);

  if (!userConnections) {
    return;
  }

  userConnections.delete(connection);

  if (!userConnections.size) {
    clients.delete(userID);
  }
};

const sendMessageWS = (json, recipientUserIds = null) => {
  const payload = encodeMessage(json);
  const recipients = recipientUserIds ? new Set(recipientUserIds) : null;

  clients.forEach((userConnections, userID) => {
    if (recipients && !recipients.has(userID)) {
      return;
    }

    userConnections.forEach((connection) => {
      try {
        connection.sendUTF(payload);
      } catch (err) {
        console.error(err);
        removeClient(userID, connection);
      }
    });
  });
};

const resolveSocketChat = async (requestedChatId, userId) => {
  if (!requestedChatId || requestedChatId === 'general') {
    return getGeneralChatForUser(userId);
  }

  return getChatByIdForUser(requestedChatId, userId);
};

const onMessage = user_id => async message => {
  if (message.type === 'utf8') {
    const dataFromClient = decodeMessage(message.utf8Data);

    switch (dataFromClient.type) {
      case WS_ACTIONS.MESSAGE_ADD:
        {
          const chat = await resolveSocketChat(dataFromClient.data.chatId || null, user_id);

          if (!chat) {
            return;
          }

          createMessage({...dataFromClient.data, chatId: chat.id, user_id}, async createdMessage => {
            const result = await getMessageWithAuthor(createdMessage._id);
            const recipientIds = await getChatUserIds(chat.id);
            sendMessageWS(result, recipientIds);
          });
        }
        break;
      case WS_ACTIONS.MESSAGE_DELETE:

        break;
      case WS_ACTIONS.REACTION_ADD:

        break;
    }
  }
};

const onClose = user_id => connection => {
  console.info((new Date()) + " Peer " + user_id + " disconnected.");
  removeClient(user_id, connection);
};

const onRequest = request => {
  try {
    const query = {...request.resourceURL.query};
    const token = query.t;
    if (!token) {
      return;
    }
    const decodedUser = jwt.verify(token, getTokenKey());
    const userID = decodedUser.user_id;

    console.info((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
    const connection = request.accept(null, request.origin);

    addClient(userID, connection);

    console.info('connected: ' + userID + ' tabs: ' + clients.get(userID).size);

    connection.on('message', onMessage(userID));
    connection.on('close', onClose(userID));
  } catch (e) {
    console.error(e);
  }
};

module.exports = {
  onRequest,
  wsClients: clients,
  sendMessageWS,
  decodeMessage
};
