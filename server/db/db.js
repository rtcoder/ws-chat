const mongoose = require('mongoose');
const {getConfig} = require('../utils/config');
const {MessageSchema} = require("./models/messageSchema");
const {UserSchema} = require("./models/userSchema");


const connect = async () => new Promise((resolve, reject) => {
  mongoose.connection.on('connected', () => resolve());
  mongoose.connection.on('invalid credentials', () => reject('invalid credentials'));
  mongoose.connect(getConfig().DB.MONGO.HOST);
});

module.exports = {
  getMongoDb: () => mongoose.connection,
  Message: mongoose.model('Message', MessageSchema),
  User: mongoose.model('User', UserSchema),
  mongoConnect: connect
};
