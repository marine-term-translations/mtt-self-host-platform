// Configuration module - loads environment variables and exports config object

require("dotenv").config();

const config = {
  port: process.env.PORT || 5000,
  isProd: process.env.NODE_ENV === 'production',
  baseUrl: process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://mtt.vliz.be' : 'http://localhost:5000'),
  frontendUrl: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://mtt.vliz.be' : 'http://localhost:5173'),
  orcid: {
    clientId: process.env.ORCID_CLIENT_ID,
    clientSecret: process.env.ORCID_CLIENT_SECRET,
  },
  session: {
    secret: (() => {
      const secret = process.env.SESSION_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET must be set in production environment');
      }
      return secret || 'INSECURE-DEFAULT-CHANGE-ME-IN-PRODUCTION';
    })(),
  },
  translations: {
    dbPath: process.env.SQLITE_DB_PATH || 'backend/data/translations.db',
  },
  graphdb: {
    url: process.env.GRAPHDB_URL || 'http://graphdb:7200',
    repository: process.env.GRAPHDB_REPO || 'kgap',
  },
};

module.exports = config;
