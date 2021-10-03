const {Schema} = require("mongoose");

const ImageSchema = new Schema({
    path: String,
    author: {type: Schema.Types.ObjectId, ref: 'User'},
    chatId: {type: Schema.Types.ObjectId, ref: 'Chat'}
  },
  {
    timestamps: true
  }
);

module.exports = {
  ImageSchema,
};
