# Self-Hosting Setup Guide

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
| `OPENROUTER_API_KEY` | No | - | OpenRouter API key for AI translation suggestions |

### Example Production Configuration

```bash
# Production domain settings
NODE_ENV=production
BASE_URL=https://mtt.example.org
FRONTEND_URL=https://mtt.example.org

# Frontend URLs (must be accessible from browser)
VITE_API_URL=https://mtt.example.org/api
VITE_DOMAIN=mtt.example.org

# ORCID OAuth
ORCID_CLIENT_ID=APP-XXXXXXXXXXXXXXXX
ORCID_CLIENT_SECRET=11111111-2222-3333-4444-555555555555

# Session security
SESSION_SECRET=your-very-long-random-string-here-change-this

# Optional: AI translation assistance
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

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

### Verify DNS Propagation

```bash
# Check DNS resolution
dig terms.example.org +short

# Or using nslookup
nslookup terms.example.org
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
    reverse_proxy /app/* frontend:4173
    reverse_proxy gitea:3000
}
```

### Option 3: nginx with Certbot

Use an external nginx installation with Certbot for SSL certificates.

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

# Check individual service
docker compose logs frontend
docker compose logs backend
docker compose logs gitea
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

5. Copy the Client ID and Client Secret
6. Add them to your `.env` file:
   ```bash
   ORCID_CLIENT_ID=APP-XXXXXXXXXXXXXXXX
   ORCID_CLIENT_SECRET=11111111-2222-3333-4444-555555555555
   ```

### 2. Restart Services

```bash
docker compose restart
```

### 3. Access the Application

1. Navigate to `http://localhost:4173` (or your domain)
2. Click "Sign in with ORCID"
3. Authenticate with your ORCID iD
4. You will be redirected back to the application

The database will be automatically created and initialized with the schema on first startup.

---

## Production vs Development

### Development Mode

Default configuration runs in development mode:

```bash
# Uses localhost URLs
NODE_ENV=development
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:5000/api
```

Access locally:
- Frontend: http://localhost:4173
- Backend API: http://localhost:5000/api
- API Docs: http://localhost:5000/api/docs

**ORCID Redirect URI for development:**
```
http://localhost:5000/api/auth/orcid/callback
```

### Production Mode

Update `.env` for production:

```bash
NODE_ENV=production
BASE_URL=https://mtt.example.org
FRONTEND_URL=https://mtt.example.org
VITE_API_URL=https://mtt.example.org/api
VITE_DOMAIN=mtt.example.org

# Update ORCID redirect URI in ORCID Developer Tools to:
# https://mtt.example.org/api/auth/orcid/callback
```

Rebuild with:

```bash
docker compose up -d --build
```

**Important:** Update the redirect URI in your ORCID OAuth application to match your production domain.

---

## Updating the Instance

### Standard Update

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose up -d --build
```

### Update with Data Preservation

```bash
# Backup database first
cp backend/data/translations.db backups/translations-$(date +%Y%m%d-%H%M%S).db

# Pull changes
git pull origin main

# Rebuild
docker compose up -d --build
```

### Full Reset (Data Loss)

### Full Reset (Data Loss)

⚠️ **WARNING**: This will delete all data including the database.

```bash
# Stop containers
docker compose down

# Remove database
rm -rf backend/data/

# Restart fresh
docker compose up -d --build
```

---

## Troubleshooting

### Port Conflicts

**Symptom**: "Port already in use" error.

**Solution**: Change ports in `docker-compose.yml` or stop conflicting services:

```bash
# Find what's using a port
lsof -i :5000

# Or change in docker-compose.yml:
ports:
  - "5001:5000"  # Map host 5001 to container 5000
```

### SSL Certificate Issues

**Symptom**: Certificate errors or HTTPS not working.

**Solution**:
1. Verify DNS is properly configured
2. Check reverse proxy logs
3. Ensure ports 80 and 443 are open
4. Wait for certificate propagation (can take a few minutes)

### ORCID Callback Fails

**Symptom**: Redirect to `/login?error=invalid_state` or error after ORCID login.

**Solution**:
1. Ensure `BASE_URL` in backend matches the domain: `BASE_URL=https://mtt.example.org`
2. Check ORCID redirect URI is exactly: `https://mtt.example.org/api/auth/orcid/callback`
3. Verify `NODE_ENV=production` is set (for secure cookies over HTTPS)
4. Check that SESSION_SECRET is set and consistent

### Session Doesn't Persist

**Symptom**: Logged out after page refresh.

**Solution**:
1. Ensure `NODE_ENV=production` (enables secure cookies over HTTPS)
2. Check that cookies are being set (browser DevTools > Application > Cookies)
3. Verify cookie domain matches your domain
4. Ensure SESSION_SECRET is configured

### Database Initialization Fails

**Symptom**: Backend fails to start or shows database errors.

**Solution**:

```bash
# Check backend logs
docker compose logs backend

# Ensure data directory exists and is writable
mkdir -p backend/data
chmod 755 backend/data

# Restart backend
docker compose restart backend
```

### View All Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend
```

### Frontend Build Issues

**Symptom**: Frontend fails to build or shows errors.

**Solution**:

```bash
# Check frontend logs
docker compose logs frontend

# Rebuild frontend
docker compose up -d --build frontend
```

---

## Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/marine-term-translations/mtt-self-host-platform/issues)
- **Documentation**: Check other docs in this repository
- **ORCID OAuth**: See [ORCID Developer Documentation](https://info.orcid.org/documentation/integration-guide/)
