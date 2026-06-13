const jwt = require("jsonwebtoken");
const {createMessage, getMessageWithAuthor} = require("../db/models/messageMethods");
const {getConfig} = require("../utils/config");

const getTokenKey = () => process.env.TOKEN_KEY || getConfig().API_SECRET;

const clients = new Map();

const WS_ACTIONS = {
  MESSAGE_ADD: 'message_add',
  MESSAGE_DELETE: 'message_delete',
  REACTION_ADD: 'reaction_add',
};
const decodeMessage = message => {
  return JSON.parse(
    decodeURIComponent(
      escape(
        Buffer.from(message, 'base64').toString()
      )
    )
  );
};
const encodeMessage = message => {
  return Buffer.from(
    unescape(
      encodeURIComponent(
        JSON.stringify(message)
      )
    )
  ).toString('base64');
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

const sendMessageWS = json => {
  const payload = encodeMessage(json);

  clients.forEach((userConnections, userID) => {
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

const onMessage = user_id => async message => {
  if (message.type === 'utf8') {
    const dataFromClient = decodeMessage(message.utf8Data);

    switch (dataFromClient.type) {
      case WS_ACTIONS.MESSAGE_ADD:

        createMessage({...dataFromClient.data, user_id}, message => {
          getMessageWithAuthor(message._id).then((result) => {
            sendMessageWS(result);
          });
        });
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
