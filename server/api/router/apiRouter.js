const express = require('express');
const router = express.Router();
const {postMessage, getMessage, removeMessage} = require("../controller/messageController");
const {createOrGetDirectChat, getChatMessages, listChats} = require('../controller/chatController');
const {listUsers} = require('../controller/userController');
const auth = require("../middleware/auth");

router.get('/users', auth, listUsers);
router.get('/chats', auth, listChats);
router.post('/chats/direct', auth, createOrGetDirectChat);
router.get('/chats/:id/messages', auth, getChatMessages);
router.get('/messages', auth, getMessage);
router.post('/messages', auth, postMessage);
router.delete('/messages/:id', auth, removeMessage);

module.exports = {apiRouter: router};
