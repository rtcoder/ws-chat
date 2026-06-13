const jwt = require("jsonwebtoken");
const {getConfig} = require("../../utils/config");

const getTokenKey = () => process.env.TOKEN_KEY || getConfig().API_SECRET;

const verifyToken = (req, res, next) => {
  const token = req.body.token
    || req.query.token
    || req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send({message: "A token is required for authentication"});
  }
  try {
    const decoded = jwt.verify(token, getTokenKey());
    req.user = decoded;
  } catch (err) {
    return res.status(401).send({message: "Invalid Token"});
  }
  return next();
};

module.exports = verifyToken;
