const {randomUUID} = require('crypto');
const {pgQuery} = require("../../db/db");
const {getConfig} = require("../../utils/config");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const getTokenKey = () => process.env.TOKEN_KEY || getConfig().API_SECRET;

const toUserResponse = (user, token) => ({
  _id: user.id,
  first_name: user.first_name,
  last_name: user.last_name,
  avatar: user.avatar,
  email: user.email,
  token,
});

const registerRequest = async (req, res, next) => {
  try {
    const {first_name, last_name, email, password} = req.body;
    const normalizedEmail = email.toLowerCase();
    const oldUser = await pgQuery('SELECT id FROM users WHERE email = $1', [normalizedEmail]);

    if (oldUser.rows.length) {
      return res.status(409).json({
        message: "User Already Exist. Please Login"
      });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    const result = await pgQuery(`
      INSERT INTO users (id, first_name, last_name, email, password)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, first_name, last_name, avatar, email
    `, [userId, first_name, last_name, normalizedEmail, encryptedPassword]);
    const user = result.rows[0];

    const token = jwt.sign(
      {user_id: user.id, email: normalizedEmail},
      getTokenKey(),
      {
        expiresIn: "2h",
      }
    );

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
    const result = await pgQuery(`
      SELECT id, first_name, last_name, avatar, email, password
      FROM users
      WHERE email = $1
    `, [normalizedEmail]);
    const user = result.rows[0];

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
