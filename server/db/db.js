const {Pool} = require('pg');
const {getConfig} = require('../utils/config');

const pool = new Pool(getConfig().DB.POSTGRES);

const query = (text, params) => pool.query(text, params);

const connect = async () => {
  await query('SELECT 1');
};

module.exports = {
  pgPool: pool,
  pgQuery: query,
  pgConnect: connect,
};
