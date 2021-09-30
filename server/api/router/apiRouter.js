const express = require('express');
const router = express.Router();
const {postMessage, getMessage,} = require("../controller/messageController");
const auth = require("../middleware/auth");

router.get('/messages', auth, getMessage);
router.post('/messages', auth, postMessage);

module.exports = {apiRouter: router};
