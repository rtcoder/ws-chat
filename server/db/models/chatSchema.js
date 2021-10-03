const {Schema} = require("mongoose");

const ChatSchema = new Schema({
    name: String,
    image: String,
    members: [{type: Schema.Types.ObjectId, ref: 'User'}],
    owner: {type: Schema.Types.ObjectId, ref: 'User'},
    msgColor: String,
    fontColor: String,
    background: {type: String, default: '#fff'}
  },
  {
    timestamps: true
  }
);

module.exports = {
  ChatSchema,
};
