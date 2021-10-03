const {Message} = require("../../db/db");
const {ObjectId} = require("mongodb");

const createMessage = async (
  data,
  afterSave = (message) => {
  }
) => {

  const ranges = [
    '\ud83c[\udf00-\udfff]', // U+1F300 to U+1F3FF
    '\ud83d[\udc00-\ude4f]', // U+1F400 to U+1F64F
    '\ud83d[\ude80-\udeff]', // U+1F680 to U+1F6FF
    ' ', // Also allow spaces
  ].join('|');
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
    console.log('afterSave result:', result);
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
