# Self-Hosting Setup Guide

[![EMODnet Biology Sponsored](https://img.shields.io/badge/Sponsored%20by-EMODnet%20Biology-005596?style=for-the-badge)](https://emodnet.ec.europa.eu/en/biology)

> [!NOTE]
> **Sponsored by EMODnet Biology**  
> Marine Term Translations (MTT) is developed within the framework of [EMODnet Biology](https://emodnet.ec.europa.eu/en/biology) (European Marine Observation and Data Network) to facilitate the internationalization, translation, and harmonization of marine science vocabularies.
> 
> *The European Marine Observation and Data Network (EMODnet) is financed by the European Union under Regulation (EU) 2021/1139 of the European Parliament and of the Council of 7 July 2021 establishing the European Maritime, Fisheries and Aquaculture Fund.*

---

This document provides a comprehensive step-by-step guide for deploying your own instance of the Marine Term Translations (MTT) Platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone the Repository](#clone-the-repository)
- [Environment Configuration](#environment-configuration)
- [Domain and DNS Setup](#domain-and-dns-setup)
- [SSL and Let's Encrypt](#ssl-and-lets-encrypt)
- [Deployment](#deployment)
- [Post-Deployment Setup](#post-deployment-setup)
- [Production vs Development](#production-vs-development)
- [Updating the Instance](#updating-the-instance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed on your host system:

| Requirement | Minimum Version | Purpose |
|-------------|-----------------|---------|
| [Docker](https://docs.docker.com/get-docker/) | 20.10+ | Container runtime |
| [Docker Compose](https://docs.docker.com/compose/install/) | 2.0+ | Multi-container orchestration |
| [Git](https://git-scm.com/downloads) | 2.30+ | Repository management |

### Verify Installation

```bash
docker --version
docker compose version
git --version
```

### System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 2GB minimum, 4GB recommended
- **Disk**: 10GB+ free space
- **Network**: Open ports 4173 and 5000 (or reverse proxy on 80/443)

---

## Clone the Repository

```bash
git clone https://github.com/marine-term-translations/mtt-self-host-platform.git
cd mtt-self-host-platform
```

---

## Environment Configuration

### Create Your Environment File

```bash
cp .env.example .env
```

### Environment Variable Reference

Edit the `.env` file with your configuration. Below is a complete reference of all available variables:

#### ORCID OAuth Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ORCID_CLIENT_ID` | Yes | - | ORCID OAuth client ID |
| `ORCID_CLIENT_SECRET` | Yes | - | ORCID OAuth client secret |
| `SESSION_SECRET` | Yes | - | Secret for session encryption (long random string) |

#### Backend Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode (`development` or `production`) |
| `BASE_URL` | No | `http://localhost:5000` | Backend base URL |
| `FRONTEND_URL` | No | `http://localhost:5173` | Frontend URL for CORS |

#### Frontend Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `http://localhost:5000/api` | Backend API endpoint (browser-accessible) |
| `VITE_DOMAIN` | No | `localhost` | Domain name |

#### Translation Database Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SQLITE_DB_PATH` | No | `backend/data/translations.db` | Path to SQLite database |

#### Optional API Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_OPENROUTER_API_KEY` | No | - | Fallback OpenRouter API key for AI translations. Users can provide their own key in Settings. Get yours from https://openrouter.ai/settings/keys |

---

## Domain and DNS Setup

For production deployments, configure your DNS records:

### A Record (Direct IP)

```
Type: A
Name: terms (or @ for root domain)
Value: <your-server-ip>
TTL: 3600
```

### CNAME Record (For subdomains)

```
Type: CNAME
Name: terms
Value: your-server.example.org
TTL: 3600
```

---

## SSL and Let's Encrypt

The platform does not include a built-in reverse proxy with SSL termination. You have several options:

### Option 1: Traefik (Recommended)

Add a Traefik service to your `docker-compose.yml`:

```yaml
services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.org"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "./letsencrypt:/letsencrypt"
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
```

### Option 2: Caddy

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
```

With a `Caddyfile`:

```
terms.example.org {
    reverse_proxy /api/* backend:5000
    reverse_proxy /* frontend:4173
}
```

---

## Deployment

### Quick Start

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your ORCID credentials and settings

# 2. Deploy
docker compose up -d --build
```

The database will be automatically initialized on first startup.

### Verify Deployment

```bash
# Check all services are running
docker compose ps

# View logs
docker compose logs -f
```

---

## Post-Deployment Setup

After initial deployment, complete these steps:

### 1. Register ORCID OAuth Application

Before using the platform, register an OAuth application with ORCID:

1. Go to https://orcid.org/developer-tools
2. Sign in with your ORCID iD
3. Navigate to "Developer Tools" → "Register for the free public API"
4. Fill in application details:
   - **Application name**: Marine Term Translations
   - **Website URL**: Your domain (e.g., `https://mtt.example.org`)
   - **Description**: Translation platform for marine terminology
   - **Redirect URI**: `http://localhost:5000/api/auth/orcid/callback` (for development) or `https://mtt.example.org/api/auth/orcid/callback` (for production)
5. Copy the Client ID and Client Secret to `.env`.

### 2. Restart Services

```bash
docker compose restart
```

### 3. Access the Application

1. Navigate to `http://localhost:4173` (or your domain)
2. Click "Sign in with ORCID"
3. Authenticate with your ORCID iD

---

## License & Funding

This project is licensed under the [MIT License](../LICENSE).

**Funding Acknowledgment:**  
This platform was developed with support from **EMODnet Biology** (European Marine Observation and Data Network), financed by the European Union under Regulation (EU) 2021/1139 of the European Parliament and of the Council of 7 July 2021 establishing the European Maritime, Fisheries and Aquaculture Fund.
