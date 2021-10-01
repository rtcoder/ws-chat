const {Schema} = require("mongoose");

const MessageSchema = new Schema({
    text: String,
    images: [String],
    author: {type: Schema.Types.ObjectId, ref: 'User'},
    reactions: [
      {
        user: {type: Schema.Types.ObjectId, ref: 'User'},
        type: String
      }
    ],
    replyTo: {type: Schema.Types.ObjectId, ref: 'Message'},
  },
  {
    timestamps: true
  }
);

module.exports = {
  MessageSchema
};
