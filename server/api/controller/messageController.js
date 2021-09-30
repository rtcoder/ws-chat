const {Message} = require("../../db/db");
const {ObjectId} = require("mongodb");

const getMessage = async (req, res, next) => {
  try {
    res.json(
      await Message.find()
        .populate('author', 'first_name last_name')
        .exec()
    );
  } catch (err) {
    console.log(err);
  }
};

const postMessage = async (req, res, next) => {
  try {
    const {text, images} = req.body;

    await new Message({
      text,
      images,
      author: new ObjectId(req.user.user_id)
    }).save();

    res.status(201).send();
  } catch (err) {
    console.log(err);
  }
};


module.exports = {
  getMessage,
  postMessage,
};
