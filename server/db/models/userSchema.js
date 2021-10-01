const { Schema } = require("mongoose");

const UserSchema = new Schema({
  first_name: { type: String, default: null },
  last_name: { type: String, default: null },
  email: { type: String },
  password: { type: String },
  token: { type: String },
});

module.exports = {
  UserSchema
};
