const jwt = require("jsonwebtoken");
const {createMessage, getMessageWithAuthor} = require("../db/models/messageMethods");
const config = process.env;

const clients = {};

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

const sendMessageWS = json => {
  Object.keys(clients).map((client) => {
    clients[client].sendUTF(
      encodeMessage(json)
    );
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
  delete clients[user_id];
};

const onRequest = request => {
  try {
    const query = {...request.resourceURL.query};
    const token = query.t;
    if (!token) {
      return;
    }
    const decodedUser = jwt.verify(token, config.TOKEN_KEY);
    const userID = decodedUser.user_id;

    console.info((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
    const connection = request.accept(null, request.origin);

    clients[userID] = connection;

    console.info('connected: ' + userID);

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
