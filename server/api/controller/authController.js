const {randomUUID} = require('crypto');
const {eq} = require('drizzle-orm');
const {db} = require("../../db/db");
const {users} = require("../../db/schema");
const {getConfig} = require("../../utils/config");
const {ensureUserInGeneralChat} = require('../../db/models/chatMethods');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getTokenKey = () => process.env.TOKEN_KEY || getConfig().API_SECRET;

const toUserResponse = (user, token) => ({
  _id: user.id,
  first_name: user.firstName,
  last_name: user.lastName,
  avatar: user.avatar,
  email: user.email,
  token,
});

const registerRequest = async (req, res, next) => {
  try {
    const {first_name, last_name, email, password} = req.body;
    const normalizedEmail = email.toLowerCase();
    const oldUser = await db
      .select({id: users.id})
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (oldUser.length) {
      return res.status(409).json({
        message: "User Already Exist. Please Login"
      });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        firstName: first_name,
        lastName: last_name,
        email: normalizedEmail,
        password: encryptedPassword,
      })
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        email: users.email,
      });

    const token = jwt.sign(
      {user_id: user.id, email: normalizedEmail},
      getTokenKey(),
      {
        expiresIn: "2h",
      }
    );

    await ensureUserInGeneralChat(user.id);
    res.status(201).json(toUserResponse(user, token));
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

const loginRequest = async (req, res, next) => {
  try {
    const {email, password} = req.body;
    const normalizedEmail = email.toLowerCase();
    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        email: users.email,
        password: users.password,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        {user_id: user.id, email: normalizedEmail},
        getTokenKey()
      );

      res.status(200).json(toUserResponse(user, token));
    } else {
      res.status(400).send({message: "Invalid Credentials"});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

module.exports = {
  registerRequest,
  loginRequest,
};
