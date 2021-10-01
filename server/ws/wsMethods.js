const jwt = require("jsonwebtoken");
const {createMessage, getMessageWithAuthor} = require("../db/models/messageMethods");
const config = process.env;

const clients = {};

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
    const dataFromClient = JSON.parse(message.utf8Data);

    createMessage({...dataFromClient, user_id}).then(message => {
      getMessageWithAuthor(message._id).then((result) => {
        sendMessageWS(result);
      });
    });
  }
};

const onClose = user_id => connection => {
  console.info((new Date()) + " Peer " + user_id + " disconnected.");
  delete clients[user_id];
};

const onRequest = request => {
  try {
    const query = {...request.resourceURL.query};
    const token = query.token;
    const decodedUser = jwt.verify(token, config.TOKEN_KEY);
    const userID = decodedUser.user_id;

    console.info((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
    const connection = request.accept(null, request.origin);

    clients[userID] = connection;

    console.info('connected: ' + userID, decodedUser);

    connection.on('message', onMessage(userID));
    connection.on('close', onClose(userID));
  } catch (e) {
    console.error(e);
  }
};

module.exports = {
  onRequest,
  wsClients: clients,
  sendMessageWS
};
