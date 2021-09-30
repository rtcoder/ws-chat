const express = require('express');
const router = express.Router();
const {loginPasswordSchema, registerSchema} = require('../validation/authValidation');
const {registerRequest, loginRequest,} = require("../controller/authController");
const {validate} = require('express-validation');

router.post('/register',
  validate(registerSchema),
  registerRequest
);
router.post('/login',
  validate(loginPasswordSchema),
  loginRequest);

module.exports = {authRouter: router};
