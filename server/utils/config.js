const config = {
  API_SECRET: process.env.API_SECRET || '2137',
  REFRESH_SESSION_TIME: '10m',
  PORTS: {
    API: Number(process.env.API_PORT || 4001),
    WS: Number(process.env.WS_PORT || 8001),
  },
  DB: {
    POSTGRES: {
      connectionString: process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING,
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'ws_chat',
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
    }
  }
};

module.exports = {getConfig: () => config};
