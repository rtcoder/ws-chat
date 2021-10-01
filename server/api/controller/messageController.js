const {Message} = require("../../db/db");
const {createMessage, getMessageWithAuthor} = require("../../db/models/messageMethods");
const {sendMessageWS} = require("../../ws/wsMethods");

const getMessage = async (req, res, next) => {
  try {
    res.json(
      (await Message.find()
        .populate('author', 'first_name last_name')
        .sort({$natural: -1}).limit(30)
        .exec()).reverse()
    );
  } catch (err) {
    console.error(err);
  }
};

const postMessage = async (req, res, next) => {
  try {
    const {text, images} = req.body;

    createMessage({text, images, user_id: req.user.user_id}, (message) => {
      getMessageWithAuthor(message._id).then((result) => {
        sendMessageWS(result);
      });
    });
    res.status(201).send();
  } catch (err) {
    console.error(err);
  }
};


module.exports = {
  getMessage,
  postMessage,
};
