const {Pool} = require('pg');
const {drizzle} = require('drizzle-orm/node-postgres');
const {sql} = require('drizzle-orm');
const {getConfig} = require('../utils/config');
const schema = require('./schema');

const pool = new Pool(getConfig().DB.POSTGRES);
const db = drizzle({client: pool, schema});

const connect = async () => {
  await db.execute(sql`SELECT 1`);
};

module.exports = {
  db,
  pgPool: pool,
  pgConnect: connect,
};
