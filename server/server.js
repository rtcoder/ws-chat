require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const cors = require('cors');
const {authRouter} = require("./api/router/authRouter");
const {apiRouter} = require("./api/router/apiRouter");
const {pgConnect} = require("./db/db");
const {getConfig} = require("./utils/config");
const {ValidationError} = require("express-validation");
const webSocketServer = require('websocket').server;
const http = require('http');
const {onRequest} = require("./ws/wsMethods");
const {getClientDistDir, getUploadsDir} = require('./utils/paths');

const config = getConfig();
const apiPort = config.PORTS.API;
const webSocketsServerPort = config.PORTS.WS;
const clientDistDir = getClientDistDir();

app.use(cors());
// app.use(express.urlencoded());
app.use(express.json({limit: '100mb'}));
app.use('/auth', authRouter);
app.use('/api', apiRouter);
app.use('/uploads', express.static(getUploadsDir()));

if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/uploads')) {
      return next();
    }

    return res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

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

pgConnect()
  .then(() => console.info('Connected to PostgreSQL'))
  .then(() => app.listen(apiPort, () => console.info("Server started and is listening on port " + apiPort)))
  .catch(err => console.error(err));
