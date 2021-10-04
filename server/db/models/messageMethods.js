const {Message} = require("../../db/db");
const {ObjectId} = require("mongodb");

const createMessage = async (
  data,
  afterSave = (message) => {
  }
) => {

  const ranges = require('../../static/json/emoji-codes.json').join('|');
  const removeEmoji = () => (data.text || '')
    .replace(/\s/g, '')
    .replace(new RegExp(ranges, 'g'), '');
  const emo_test = () => !removeEmoji().length;
  const isOnlyEmoji = emo_test();

  await new Message({
    ...data,
    isOnlyEmoji,
    author: new ObjectId(data.user_id)
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
