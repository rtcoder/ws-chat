require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const {authRouter} = require("./api/router/authRouter");
const {apiRouter} = require("./api/router/apiRouter");
const {mongoConnect} = require("./db/db");
const {ValidationError} = require("express-validation");

app.use(cors());
// app.use(express.urlencoded());
app.use(express.json());
app.use('/auth', authRouter);
app.use('/api', apiRouter)
app.use(function (err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json(err);
  }
  return res.status(500).json(err);
});

mongoConnect()
  .then(() => console.log('Connected to MongoDB'))
  .then(() => app.listen(8000, () => console.log("Server started and is listening on port 8000")))
  .catch(err => console.log(err));
