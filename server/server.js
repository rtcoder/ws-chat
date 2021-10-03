require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const {authRouter} = require("./api/router/authRouter");
const {apiRouter} = require("./api/router/apiRouter");
const {mongoConnect} = require("./db/db");
const {ValidationError} = require("express-validation");
const webSocketsServerPort = 8001;
const webSocketServer = require('websocket').server;
const http = require('http');
const {onRequest} = require("./ws/wsMethods");


app.use(cors());
// app.use(express.urlencoded());
app.use(express.json({limit: '100mb'}));
app.use('/auth', authRouter);
app.use('/api', apiRouter);
app.use('/uploads', express.static(__dirname + '/uploads'));

app.use(function (err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(err);
  }
  return res.status(500).json(err);
});

// Websocket server
const server = http.createServer(app);
server.listen(webSocketsServerPort);
const wsServer = new webSocketServer({
  httpServer: server
});
wsServer.on('request', onRequest);

mongoConnect()
  .then(() => console.info('Connected to MongoDB'))
  .then(() => app.listen(8000, () => console.info("Server started and is listening on port 8000")))
  .catch(err => console.error(err));
