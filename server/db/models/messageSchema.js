const {Schema} = require("mongoose");

const MESSAGE_TYPES = {
  MESSAGE: 'msg',
  REPLY: 'msg_reply',
  INFO_JOIN_MEMBER: 'new_member',
  INFO_LEFT_MEMBER: 'left_member',
  INFO_REMOVE_MEMBER: 'remove_member',
  INFO_CHANGE_BACKGROUND: 'info_change_background',
  INFO_CHANGE_COLOR: 'info_change_color',
  INFO_CHANGE_CHAT_NAME: 'info_change_chat_name',
  INFO_CHANGE_NICKNAME: 'info_change_nickname',
};

const MessageSchema = new Schema({
    text: String,
    images: [String],
    author: {type: Schema.Types.ObjectId, ref: 'User'},
    relatedUser: {type: Schema.Types.ObjectId, ref: 'User'},
    reactions: [{
      user: {type: Schema.Types.ObjectId, ref: 'User'},
      type: String
    }],
    replyTo: {type: Schema.Types.ObjectId, ref: 'Message'},
    type: {type: String, default: MESSAGE_TYPES.MESSAGE},
    isSpoiler: {type: Boolean, default: false},
    isOnlyEmoji: {type: Boolean, default: false},
    chatId: {type: Schema.Types.ObjectId, ref: 'Chat'}
  },
  {
    timestamps: true
  }
);

module.exports = {
  MessageSchema,
  MESSAGE_TYPES
};
