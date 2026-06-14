const express = require('express');
const router = express.Router();
const {postMessage, getMessage, removeMessage} = require("../controller/messageController");
const auth = require("../middleware/auth");

router.get('/messages', auth, getMessage);
router.post('/messages', auth, postMessage);
router.delete('/messages/:id', auth, removeMessage);

module.exports = {apiRouter: router};
