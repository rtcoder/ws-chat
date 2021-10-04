const {User} = require("../../db/db");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerRequest = async (req, res, next) => {
  try {
    const {first_name, last_name, email, password} = req.body;
    const oldUser = await User.findOne({email});
    if (oldUser) {
      return res.status(409).json({
        message: "User Already Exist. Please Login"
      });
    }

    const encryptedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      first_name,
      last_name,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
    });

    const token = jwt.sign(
      {user_id: user._id, email},
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    );
    user.token = token;

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

const loginRequest = async (req, res, next) => {
  try {
    const {email, password} = req.body;
    const user = await User.findOne({email});

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        {user_id: user._id, email},
        process.env.TOKEN_KEY
      );

      user.token = token;
      const returnedValue = {
        ...user.toObject(),
        password: undefined,
        __v: undefined
      };
      res.status(200).json(returnedValue);
    } else {
      res.status(400).send({message: "Invalid Credentials"});
    }
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  registerRequest,
  loginRequest,
};
