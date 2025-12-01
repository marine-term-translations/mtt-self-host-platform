# Marine Term Translations Platform

Production-ready self-hosting platform for marine term translations, featuring a React frontend, Express.js backend, Gitea for source-of-truth version control, and automated CI/CD workflows.

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
- **Git-based versioning** - Complete translation history via Gitea
- **AI-powered suggestions** - Optional Gemini API integration
- **Automated workflows** - CI/CD via Gitea Actions Runner

---

## Services

The platform consists of five Docker services defined in `docker-compose.yml`:

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
| `VITE_GITEA_URL` | Gitea URL (browser-accessible) | `http://localhost:3000` |
| `VITE_DOMAIN` | Domain name | `localhost` |
| `VITE_ROOT_URL` | Full root URL | `http://localhost:3000/` |

**Volume Mounts:** None (stateless)

**Local Access:** http://localhost:4173

---

### Backend (Node.js + Express)

| Property | Value |
|----------|-------|
| **Container** | `marine-backend` |
| **Port** | `5000` |
| **Technology** | Node.js 20, Express.js, SQLite |
| **Purpose** | REST API for translations, users, and Gitea integration |

**Environment Variables:**
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `GITEA_URL` | Internal Gitea URL | `http://gitea:3000` |
| `GITEA_TOKEN` | Admin API token | Set after setup |
| `TRANSLATIONS_REPO` | Repository name | `translations-data` |
| `TRANSLATIONS_REPO_PATH` | Local repo path | `/app/translations-data` |
| `SQLITE_DB_PATH` | SQLite database path | `/app/translations-data/translations.db` |

**Local Access:** 
- API: http://localhost:5000/api
- Swagger Docs: http://localhost:5000/api/docs

---

### Gitea (Git Service)

| Property | Value |
|----------|-------|
| **Container** | `gitea` |
| **Port** | `3000` |
| **Technology** | Gitea 1.25 |
| **Purpose** | Version control, user auth, repository hosting |

**Environment Variables:**
| Variable | Description | Default |
|----------|-------------|---------|
| `GITEA__database__DB_TYPE` | Database type | `postgres` |
| `GITEA__database__HOST` | Database host | `db:5432` |
| `GITEA__database__NAME` | Database name | `gitea` |
| `GITEA__database__USER` | Database user | `gitea` |
| `GITEA__database__PASSWD` | Database password | From `GITEA_DB_PASS` |
| `GITEA__server__DOMAIN` | Server domain | From `DOMAIN` |
| `GITEA__server__ROOT_URL` | Root URL | From `ROOT_URL` |
| `GITEA__actions__ENABLED` | Enable Actions | `true` |

**Volume Mounts:**
| Container Path | Host Path | Purpose |
|----------------|-----------|---------|
| `/data` | `./gitea/data` | Repositories and config |
| `/etc/timezone` | `/etc/timezone` | Timezone (read-only) |
| `/etc/localtime` | `/etc/localtime` | Local time (read-only) |

**Local Access:** http://localhost:3000

---

### PostgreSQL Database

| Property | Value |
|----------|-------|
| **Container** | `db` |
| **Port** | `5432` (internal only) |
| **Technology** | PostgreSQL 16 Alpine |
| **Purpose** | Gitea metadata storage |

**Environment Variables:**
| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` | `gitea` |
| `POSTGRES_PASSWORD` | From `GITEA_DB_PASS` |
| `POSTGRES_DB` | `gitea` |

**Volume Mounts:**
| Container Path | Host Path |
|----------------|-----------|
| `/var/lib/postgresql/data` | `./gitea/postgres` |

**Note:** Not exposed externally for security.

---

### Actions Runner

| Property | Value |
|----------|-------|
| **Container** | `act-runner` |
| **Technology** | Gitea Act Runner |
| **Purpose** | CI/CD workflow execution |

**Environment Variables:**
| Variable | Description |
|----------|-------------|
| `GITEA_INSTANCE_URL` | `http://gitea:3000` |
| `GITEA_RUNNER_REGISTRATION_TOKEN` | From `RUNNER_TOKEN` |
| `RUNNER_NAME` | `marine-runner` |
| `RUNNER_LABELS` | `linux,docker` |
| `CONFIG_FILE` | `/data/config.yaml` |

**Volume Mounts:**
| Container Path | Host Path |
|----------------|-----------|
| `/data` | `./runner` |
| `/var/run/docker.sock` | `/var/run/docker.sock` |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/marine-term-translations/mtt-self-host-platform.git
cd mtt-self-host-platform

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your settings (see docs/SETUP.md for full reference)

# 3. Copy runner configuration
cp runner/config.yaml.template runner/config.yaml

# 4. Deploy
docker compose up -d --build

# 5. Verify all services are running
docker compose ps
```

---

## Post-Deployment Setup

After initial deployment, complete the following steps:

### 1. Create Admin Account

1. Navigate to http://localhost:3000 (or your domain)
2. Register using credentials from `.env`:
   - **Username:** `GITEA_ADMIN_USER`
   - **Password:** `GITEA_ADMIN_PASS`
   - **Email:** `GITEA_ADMIN_EMAIL`

### 2. Generate Admin API Token

1. Log in to Gitea as admin
2. Go to **Settings** → **Applications** → **Generate New Token**
3. Name it (e.g., `admin-api-token`) and copy the value
4. Add to `.env`: `GITEA_ADMIN_TOKEN=<your-token>`

### 3. Restart Services

```bash
docker compose restart
```

### 4. Initialize Gitea Organization

```bash
sh ./infra/setup-gitea.sh
```

### 5. Register the Actions Runner

1. In Gitea, navigate to the translations repository
2. Go to **Settings** → **Actions** → **Runners** → **Create New Runner**
3. Copy the registration token
4. Add to `.env`: `RUNNER_TOKEN=<your-token>`
5. Rebuild services:
   ```bash
   sh infra/rebuild.sh
   ```

---

## Access Points

After deployment, access these endpoints:

| Service | Local URL | Production URL |
|---------|-----------|----------------|
| Gitea (Web UI) | http://localhost:3000 | https://your-domain.org |
| Backend API | http://localhost:5000/api | https://your-domain.org/api |
| API Documentation | http://localhost:5000/api/docs | https://your-domain.org/api/docs |
| Frontend App | http://localhost:4173 | https://your-domain.org/app |

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
│   └── src/
│       ├── app.js              # Express app setup
│       ├── server.js           # Entry point
│       ├── config/             # Configuration
│       ├── controllers/        # Request handlers
│       ├── routes/             # API routes
│       ├── services/           # Business logic
│       ├── middleware/         # Express middleware
│       └── docs/               # Swagger specs
│
├── frontend/                    # React/Vite application
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts          # Vite configuration
│   ├── index.html
│   └── pages/                  # React components
│
├── docs/                        # Documentation
│   └── SETUP.md                # Detailed setup guide
│
├── gitea/                       # Gitea data (created at runtime)
│   ├── data/                   # Repositories and config
│   └── postgres/               # PostgreSQL data
│
├── runner/                      # Gitea Actions runner
│   ├── config.yaml.template    # Runner configuration template
│   └── README.md               # Runner documentation
│
├── infra/                       # Infrastructure scripts
│   ├── setup-gitea.sh          # Gitea initialization
│   ├── rebuild.sh              # Rebuild containers
│   ├── backup.sh               # Backup script
│   └── restore.sh              # Restore script
│
└── templates/                   # Template files
    └── translation-repo/       # Initial repo template
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/SETUP.md](docs/SETUP.md) | Complete self-hosting guide with step-by-step instructions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, data flow, and component diagrams |
| [runner/README.md](runner/README.md) | Actions runner configuration and troubleshooting |

---

## License

MIT
