# Marine Term Translations Platform

Self-hosting platform for marine term translations, featuring a React frontend and Express.js backend with ORCID authentication.

> **📚 Documentation**: See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions and [ARCHITECTURE.md](ARCHITECTURE.md) for system architecture.

## Table of Contents

- [Overview](#overview)
- [Services](#services)
- [Quick Start](#quick-start)
- [Post-Deployment Setup](#post-deployment-setup)
- [Access Points](#access-points)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

This platform enables organizations to self-host their own marine terminology translation system with:

- **Full data sovereignty** - All data stored in your infrastructure
- **Secure ORCID authentication** - OAuth-based authentication via ORCID iD
- **SQLite database** - Lightweight, embedded database with automatic initialization
- **AI-powered suggestions** - Users can configure their own OpenRouter API key for AI translation assistance
- **Community goals** - Motivate translators with community-wide translation challenges and goals

---

## Services

The platform consists of two Docker services defined in `docker-compose.yml`:

### Frontend (Vite + React)

| Property | Value |
|----------|-------|
| **Container** | `marine-frontend` |
| **Port** | `4173` |
| **Technology** | React 18, Vite 6, TypeScript |
| **Purpose** | User interface for translation management |

**Environment Variables:**
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL (browser-accessible) | `http://localhost:5000/api` |
| `VITE_DOMAIN` | Domain name | `localhost` |

**Volume Mounts:** None (stateless)

**Local Access:** http://localhost:4173

---

### Backend (Node.js + Express)

| Property | Value |
|----------|-------|
| **Container** | `marine-backend` |
| **Port** | `5000` |
| **Technology** | Node.js 20, Express.js, SQLite |
| **Purpose** | REST API for translations, users, and ORCID authentication |

**Environment Variables:**
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `BASE_URL` | Backend base URL | `http://localhost:5000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `ORCID_CLIENT_ID` | ORCID OAuth client ID | Required |
| `ORCID_CLIENT_SECRET` | ORCID OAuth client secret | Required |
| `SESSION_SECRET` | Session encryption secret | Required |
| `SQLITE_DB_PATH` | SQLite database path | `/app/backend/data/translations.db` |

**Volume Mounts:**
| Container Path | Host Path | Purpose |
|----------------|-----------|---------|
| `/app/backend/data` | `./backend/data` | SQLite database persistence |

**Local Access:** 
- API: http://localhost:5000/api
- Swagger Docs: http://localhost:5000/api/docs

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/marine-term-translations/mtt-self-host-platform.git
cd mtt-self-host-platform

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your ORCID credentials (see docs/SETUP.md for full reference)

# 3. Deploy
docker compose up -d --build

# 4. Verify all services are running
docker compose ps
```

The database will be automatically initialized on first startup.

---

## Post-Deployment Setup

After initial deployment, you can:

### Access the Application

1. Navigate to http://localhost:4173 (or your configured domain)
2. Click "Sign in with ORCID"
3. Authenticate with your ORCID iD

### Register ORCID OAuth Application

Before using the platform, you must register an OAuth application with ORCID:

1. Go to https://orcid.org/developer-tools
2. Register a new application with redirect URI: `http://localhost:5000/api/auth/orcid/callback`
3. Copy the Client ID and Client Secret to your `.env` file
4. Restart services: `docker compose restart`

### Enable AI Translation Features (Optional)

To use AI-powered translation suggestions:

1. Log in to the platform with your ORCID account
2. Navigate to **Settings** → **AI Translation Settings**
3. Follow the [AI Translation Guide](docs/AI_TRANSLATION_GUIDE.md) to:
   - Get your free OpenRouter API key
   - Configure it in your settings
   - Start using AI translation suggestions

> 📚 See [docs/AI_TRANSLATION_GUIDE.md](docs/AI_TRANSLATION_GUIDE.md) for detailed instructions on obtaining and configuring your OpenRouter API key.

---

## Access Points

After deployment, access these endpoints:

| Service | Local URL | Production URL |
|---------|-----------|----------------|
| Frontend App | http://localhost:4173 | https://your-domain.org |
| Backend API | http://localhost:5000/api | https://your-domain.org/api |
| API Documentation | http://localhost:5000/api/docs | https://your-domain.org/api/docs |

---

## Project Structure

```
mtt-self-host-platform/
├── docker-compose.yml          # Service definitions
├── .env.example                 # Environment template
├── .gitignore
├── README.md                    # This file
├── ARCHITECTURE.md              # System architecture overview
│
├── backend/                     # Express.js API
│   ├── Dockerfile
│   ├── package.json
│   ├── data/                   # SQLite database (created at runtime)
│   └── src/
│       ├── app.js              # Express app setup
│       ├── server.js           # Entry point
│       ├── config/             # Configuration
│       ├── controllers/        # Request handlers
│       ├── routes/             # API routes
│       ├── services/           # Business logic
│       ├── middleware/         # Express middleware
│       ├── db/                 # Database utilities and migrations
│       └── docs/               # Swagger specs
│
├── frontend/                    # React/Vite application
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts          # Vite configuration
│   ├── index.html
│   ├── pages/                  # React components/pages
│   ├── components/             # Reusable components
│   └── services/               # API services
│
├── docs/                        # Documentation
│   ├── SETUP.md                # Detailed setup guide
│   ├── PRODUCTION_DEPLOYMENT.md # Production deployment
│   ├── DATABASE_INITIALIZATION.md # Database setup
│   ├── ORCID_MIGRATION.md      # ORCID OAuth guide
│   └── GITEA_REMOVAL.md        # Historical: Gitea removal notes
│
├── infra/                       # Infrastructure scripts (legacy)
│   ├── backup.sh               # Backup script
│   ├── rebuild.sh              # Rebuild containers
│   └── restore.sh              # Restore script
│
└── templates/                   # Template files
    └── translation-repo/       # Initial repo template
```

---

## Documentation

### For Users

| Document | Description |
|----------|-------------|
| [docs/AI_TRANSLATION_GUIDE.md](docs/AI_TRANSLATION_GUIDE.md) | **How to get and use OpenRouter API key for AI translations** |

### For Administrators

| Document | Description |
|----------|-------------|
| [docs/SETUP.md](docs/SETUP.md) | Complete self-hosting guide with step-by-step instructions |
| [docs/ORCID_MIGRATION.md](docs/ORCID_MIGRATION.md) | ORCID OAuth configuration guide |
| [docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md) | Production deployment guide |
| [docs/DATABASE_INITIALIZATION.md](docs/DATABASE_INITIALIZATION.md) | Database initialization and management |
| [docs/COMMUNITY_GOALS.md](docs/COMMUNITY_GOALS.md) | Community goals feature guide |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, data flow, and component diagrams |
| [docs/GITEA_REMOVAL.md](docs/GITEA_REMOVAL.md) | Historical notes on Gitea removal (for reference) |

---

## License

MIT
