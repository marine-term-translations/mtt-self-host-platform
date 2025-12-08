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
  gitea: {
    url: process.env.GITEA_URL,
    token: process.env.GITEA_TOKEN,
    adminToken: process.env.GITEA_ADMIN_TOKEN,
    adminUser: process.env.GITEA_ADMIN_USER,
    adminEmail: process.env.GITEA_ADMIN_EMAIL,
    org: {
      name: process.env.GITEA_ORG_NAME,
      fullName: process.env.GITEA_ORG_FULL_NAME,
      description: process.env.GITEA_ORG_DESCRIPTION,
      email: process.env.GITEA_ORG_EMAIL,
      location: process.env.GITEA_ORG_LOCATION,
      visibility: process.env.GITEA_ORG_VISIBILITY,
      website: process.env.GITEA_ORG_WEBSITE,
    },
  },
  translations: {
    repoName: process.env.TRANSLATIONS_REPO,
    repoPath: process.env.TRANSLATIONS_REPO_PATH,
    dbPath: process.env.SQLITE_DB_PATH,
  },
};

// Build repo URL with authentication
config.translations.repoUrl = config.gitea.url
  ? `http://oauth2:${config.gitea.token}@${config.gitea.url.replace(
      /^https?:\/\//,
      ""
    )}/${config.gitea.org.name}/${config.translations.repoName}.git`
  : null;

module.exports = config;
