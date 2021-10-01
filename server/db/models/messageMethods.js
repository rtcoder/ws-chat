const {Message} = require("../../db/db");
const {ObjectId} = require("mongodb");

const createMessage = async (
  {text, images, user_id},
  afterSave = (message) => {
  }
) => {
  await new Message({
    text,
    images,
    author: new ObjectId(user_id)
  }).save((err, result) => {
    afterSave(result);
  });
};
const getMessageWithAuthor = async (id) => {
  return await Message.findOne({_id: id})
    .populate('author', 'first_name last_name avatar')
    .exec();
};

module.exports = {
  createMessage,
  getMessageWithAuthor
};
