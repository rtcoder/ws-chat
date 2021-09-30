const config = {
  API_SECRET: process.env.API_SECRET || '2137',
  REFRESH_SESSION_TIME: '10m',
  DB: {
    MONGO: {
      HOST: process.env.MONGO_URI || 'mongodb://localhost:27017/local',
    }
  }
};

module.exports = {getConfig: () => config};
