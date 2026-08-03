# Marine Term Translations Platform

[![EMODnet Biology Sponsored](https://img.shields.io/badge/Sponsored%20by-EMODnet%20Biology-005596?style=for-the-badge)](https://emodnet.ec.europa.eu/en/biology)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docker-compose.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

> [!NOTE]
> **Sponsored by EMODnet Biology**  
> Marine Term Translations (MTT) is developed within the framework of [EMODnet Biology](https://emodnet.ec.europa.eu/en/biology) (European Marine Observation and Data Network) to facilitate the internationalization, translation, and harmonization of marine science vocabularies.
> 
> *The European Marine Observation and Data Network (EMODnet) is financed by the European Union under Regulation (EU) 2021/1139 of the European Parliament and of the Council of 7 July 2021 establishing the European Maritime, Fisheries and Aquaculture Fund.*

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Services Architecture](#services-architecture)
- [Quick Start](#quick-start)
- [Post-Deployment Setup](#post-deployment-setup)
- [Access Points](#access-points)
- [Environment Configuration](#environment-configuration)
- [Project Structure](#project-structure)
- [Documentation Index](#documentation-index)
- [License & Funding](#license--funding)

---

## Overview

The **Marine Term Translations (MTT)** platform is a self-hostable, web-based system designed for marine scientific organizations to manage, translate, and harmonize marine terminology across multiple languages. By connecting regional vocabulary terms with standard registries such as the **NERC Vocabulary Server (NVS)** and **EMODnet data portals**, MTT bridges technical marine science terminology with global community understanding.

---

## Key Features

- **Full Data Sovereignty**: Self-hosted Docker deployment with local SQLite persistence ensures complete control over your terminology assets.
- **Secure ORCID iD Authentication**: OAuth 2.0 authentication via ORCID iD guarantees verified researcher identities and contributor attribution.
- **Vocabulary & Term Harmonization**: Standardized mapping to NERC Vocabulary Server concepts and EMODnet term APIs.
- **Linked Data Event Streams (LDES)**: Real-time, specs-compliant LDES feed generation and consumer interfaces for seamless metadata synchronization across international marine networks.
- **Community Translation Goals**: Gamified community challenges and progress tracking widgets to engage translators and ocean literacy contributors.
- **AI-Powered Assistance**: Optional integration with OpenRouter API to provide AI-assisted translation suggestions directly within the workflow.
- **Moderation & Dispute Resolution**: Administrator dashboard for reviewing reports, managing user privileges, and resolving term translation disputes.
- **Personal Access Tokens (API Keys)**: User-managed API keys for programmatic access and external automated integrations.

---

## Services Architecture

The platform consists of two main Docker services defined in `docker-compose.yml`:

### Frontend (Vite + React)

| Property | Value |
|----------|-------|
| **Container** | `marine-frontend` |
| **Port** | `4173` |
| **Technology** | React 18, Vite 6, TypeScript, Tailwind CSS |
| **Purpose** | User interface for translation management, community goals, and admin controls |

### Backend (Node.js + Express)

| Property | Value |
|----------|-------|
| **Container** | `marine-backend` |
| **Port** | `5000` |
| **Technology** | Node.js 20, Express.js, SQLite3 |
| **Purpose** | REST API for translations, LDES feeds, ORCID authentication, and admin reporting |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/marine-term-translations/mtt-self-host-platform.git
cd mtt-self-host-platform

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env with your ORCID OAuth credentials (see docs/SETUP.md for full reference)

# 3. Build and launch services with Docker Compose
docker compose up -d --build

# 4. Verify all containers are healthy
docker compose ps
```

The database is automatically initialized with the standard schema on first startup.

---

## Post-Deployment Setup

After deployment, perform these initial administrative steps:

1. **Register ORCID OAuth Application**:
   - Register an application at [ORCID Developer Tools](https://orcid.org/developer-tools).
   - Set the Redirect URI to: `http://localhost:5000/api/auth/orcid/callback` (or your domain equivalent).
   - Add `ORCID_CLIENT_ID` and `ORCID_CLIENT_SECRET` to your `.env` file and run `docker compose restart`.
2. **Access the Application**:
   - Open `http://localhost:4173` (or your configured frontend URL) and click **Sign in with ORCID**.
3. **Configure AI Translation Suggestions (Optional)**:
   - Navigate to **Settings** → **AI Translation Settings**.
   - Enter your OpenRouter API Key. See [docs/AI_TRANSLATION_GUIDE.md](docs/AI_TRANSLATION_GUIDE.md).

---

## Access Points

| Service | Local URL | Production Example |
|---------|-----------|--------------------|
| **Frontend App** | http://localhost:4173 | https://your-domain.org |
| **Backend API** | http://localhost:5000/api | https://your-domain.org/api |
| **API Documentation** | http://localhost:5000/api/docs | https://your-domain.org/api/docs |

---

## Environment Configuration

Configure the environment variables in `.env` before launching:

| Variable | Scope | Description | Default |
|----------|-------|-------------|---------|
| `NODE_ENV` | Backend | Execution environment (`development`/`production`) | `production` |
| `PORT` | Backend | HTTP port for API service | `5000` |
| `BASE_URL` | Backend | Base API URL accessible by clients | `http://localhost:5000` |
| `FRONTEND_URL` | Backend | Frontend URL for CORS authorization | `http://localhost:5173` |
| `ORCID_CLIENT_ID` | Backend | Client ID from ORCID Developer Tools | *Required* |
| `ORCID_CLIENT_SECRET` | Backend | Client Secret from ORCID Developer Tools | *Required* |
| `SESSION_SECRET` | Backend | Secret key for encrypting user session cookies | *Required* |
| `SQLITE_DB_PATH` | Backend | Path to SQLite database file | `/app/backend/data/translations.db` |
| `VITE_API_URL` | Frontend | Browser API endpoint | `http://localhost:5000/api` |
| `VITE_DOMAIN` | Frontend | Public domain name | `localhost` |

---

## Project Structure

```
mtt-self-host-platform/
├── docker-compose.yml          # Multi-container service orchestrator
├── .env.example                # Environment configuration template
├── README.md                   # System documentation landing page
├── ARCHITECTURE.md             # System architecture & component data flow
│
├── backend/                    # Express.js API service
│   ├── Dockerfile
│   ├── package.json
│   ├── data/                   # Persistent SQLite database volume
│   └── src/
│       ├── app.js              # Express application setup
│       ├── server.js           # Server entry point
│       ├── controllers/        # Request handlers (auth, translations, admin)
│       ├── routes/             # REST endpoint routes
│       ├── services/           # Business logic (LDES, ORCID, OpenRouter)
│       └── db/                 # Database migrations & seeds
│
├── frontend/                   # Vite + React UI application
│   ├── Dockerfile
│   ├── package.json
│   ├── index.html
│   ├── pages/                  # React page views (Browse, About, Dashboard, Admin)
│   ├── components/             # Reusable UI components
│   └── services/               # Frontend API client modules
│
├── docs/                       # Technical & user documentation
│   ├── SETUP.md                # Comprehensive self-hosting setup guide
│   ├── PRODUCTION_DEPLOYMENT.md # Production deployment best practices
│   ├── LDES.md                 # Linked Data Event Streams integration guide
│   ├── COMMUNITY_GOALS.md      # Community goals feature overview
│   └── AI_TRANSLATION_GUIDE.md # OpenRouter AI translation guide
│
└── templates/                  # Translation repository templates
```

---

## Documentation Index

### For Users & Translators

| Guide | Description |
|-------|-------------|
| [AI Translation Guide](docs/AI_TRANSLATION_GUIDE.md) | How to obtain and configure an OpenRouter API key for AI translation assistance |
| [Community Goals Guide](docs/COMMUNITY_GOALS.md) | Overview of community translation challenges and reward systems |
| [Discussion & Moderation System](docs/DISCUSSION_SYSTEM.md) | Participating in translation discussions, submitting disputes, and flagging items |
| [Language Settings UI Guide](LANGUAGE_SETTINGS_UI_GUIDE.md) | Managing primary/target languages and user preferences |

### For Administrators & Operators

| Guide | Description |
|-------|-------------|
| [Self-Hosting Setup Guide](docs/SETUP.md) | Comprehensive step-by-step installation and initial setup |
| [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT.md) | Security, SSL certificates, Nginx reverse proxy, and scaling |
| [Database Initialization Guide](docs/DATABASE_INITIALIZATION.md) | Database schema migrations, seed data, and backup procedures |
| [ORCID OAuth Setup](docs/ORCID_MIGRATION.md) | Configuring ORCID developer keys and redirect endpoints |
| [Docker Admin Controls](docs/DOCKER_ADMIN_CONTROL.md) | Administrator container management and status monitoring |
| [SMTP & Email Setup](docs/SMTP_SETUP.md) | Configuring transactional email services for notifications |
| [User API Key Implementation](USER_API_KEY_IMPLEMENTATION.md) | Technical setup and management of personal access tokens |

### Architecture & Standards

| Guide | Description |
|-------|-------------|
| [System Architecture](ARCHITECTURE.md) | In-depth technical architecture, data flows, and component diagrams |
| [Linked Data Event Streams (LDES)](docs/LDES.md) | LDES feed specifications, fragment generation, and consumer synchronization |
| [Search and Browse API](docs/SEARCH_AND_BROWSE_API.md) | REST API endpoints for querying and filtering marine vocabularies |
| [Translation Flow](docs/TRANSLATION_FLOW.md) | Workflow lifecycle for term submissions, reviews, and approval |
| [Source Configuration Flow](docs/SOURCE_CONFIG_FLOW.md) | Dynamic vocabulary source configuration and feed sync |

---

## License & Funding

This project is licensed under the [MIT License](LICENSE).

**Funding Acknowledgment:**  
This platform was developed with support from **EMODnet Biology** (European Marine Observation and Data Network), financed by the European Union under Regulation (EU) 2021/1139 of the European Parliament and of the Council of 7 July 2021 establishing the European Maritime, Fisheries and Aquaculture Fund.
