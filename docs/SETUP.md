# Self-Hosting Setup Guide

This document provides a comprehensive step-by-step guide for deploying your own instance of the Marine Term Translations (MTT) Platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Clone the Repository](#clone-the-repository)
- [Environment Configuration](#environment-configuration)
- [Domain and DNS Setup](#domain-and-dns-setup)
- [SSL and Let's Encrypt](#ssl-and-lets-encrypt)
- [Vite Preview Host Configuration](#vite-preview-host-configuration)
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
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 20GB+ free space
- **Network**: Open ports 3000, 4173, 5000 (or reverse proxy on 80/443)

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

#### Gitea Organization Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITEA_ORG_NAME` | Yes | `marine-org` | Organization name in Gitea |
| `GITEA_ORG_FULL_NAME` | No | `Marine Organization` | Full display name |
| `GITEA_ORG_DESCRIPTION` | No | - | Organization description |
| `GITEA_ORG_EMAIL` | No | - | Contact email |
| `GITEA_ORG_LOCATION` | No | - | Organization location |
| `GITEA_ORG_WEBSITE` | No | - | Organization website URL |
| `GITEA_ORG_VISIBILITY` | No | `public` | `public` or `private` |

#### Database Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITEA_DB_PASS` | Yes | - | PostgreSQL password for Gitea database |

#### Admin Account Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITEA_ADMIN_USER` | Yes | `admin` | Admin username for Gitea |
| `GITEA_ADMIN_PASS` | Yes | - | Admin password |
| `GITEA_ADMIN_EMAIL` | Yes | - | Admin email address |
| `GITEA_ADMIN_TOKEN` | Post-setup | - | Generated after first login (see Post-Deployment) |

#### Runner Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RUNNER_TOKEN` | Post-setup | - | Runner registration token from Gitea |
| `RUNNER_NAME` | No | `marine-runner` | Name for the Actions runner |

#### Frontend Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `http://localhost:5000/api` | Backend API endpoint (browser-accessible) |
| `VITE_GITEA_URL` | Yes | `http://localhost:3000` | Gitea URL (browser-accessible) |

#### Production Domain Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOMAIN` | Prod only | `localhost` | Your public domain |
| `ROOT_URL` | Prod only | `http://localhost:3000/` | Full root URL with protocol |

#### Translation Database Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRANSLATIONS_REPO` | Yes | `translations-data` | Repository name for translations |
| `TRANSLATIONS_REPO_PATH` | Yes | `backend/translations-data` | Local path to repo |
| `SQLITE_DB_PATH` | Yes | `backend/translations-data/translations.db` | Path to SQLite database |

### Example Production Configuration

```bash
# Production domain settings
DOMAIN=terms.example.org
ROOT_URL=https://terms.example.org/

# Frontend URLs (must be accessible from browser)
VITE_API_URL=https://terms.example.org/api
VITE_GITEA_URL=https://terms.example.org/

# Database
GITEA_DB_PASS=your_secure_password_here

# Admin credentials
GITEA_ADMIN_USER=admin
GITEA_ADMIN_PASS=secure_admin_password
GITEA_ADMIN_EMAIL=admin@example.org
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

## Vite Preview Host Configuration

The frontend uses Vite in preview mode, which requires whitelisting allowed hosts for security.

### Adding Custom Domains

Edit `frontend/vite.config.ts`:

```typescript
preview: {
  port: 4173,
  host: '0.0.0.0',
  allowedHosts: [
    'localhost',
    '127.0.0.1',
    'terms.yourdomain.org',  // Add your domain here
    // Or allow all subdomains:
    // '.yourdomain.org',
  ],
},
```

### Quick Fix for Development

For quick testing (not recommended for production):

```typescript
preview: {
  allowedHosts: 'all',
},
```

After modifying, rebuild the frontend:

```bash
docker compose up -d --build frontend
```

---

## Deployment

### Quick Start

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# 2. Copy runner configuration
cp runner/config.yaml.template runner/config.yaml

# 3. Deploy
docker compose up -d --build
```

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

### 1. Create Admin Account

1. Navigate to `http://localhost:3000` (or your domain)
2. Register using credentials from `.env`:
   - Username: `GITEA_ADMIN_USER`
   - Password: `GITEA_ADMIN_PASS`
   - Email: `GITEA_ADMIN_EMAIL`

### 2. Generate Admin API Token

1. Log in to Gitea as admin
2. Go to **Settings** → **Applications**
3. Under "Generate New Token", enter a name (e.g., `admin-api-token`)
4. Click **Generate Token**
5. Copy the token and add to `.env`:
   ```
   GITEA_ADMIN_TOKEN=<your-generated-token>
   ```

### 3. Restart Services

```bash
docker compose restart
```

### 4. Run Setup Script

```bash
sh ./infra/setup-gitea.sh
```

This creates the translations repository with the database schema.

### 5. Register the Actions Runner

1. Log in to Gitea as admin
2. Navigate to the translations repository
3. Go to **Settings** → **Actions** → **Runners**
4. Click **Create new Runner**
5. Copy the registration token
6. Add to `.env`:
   ```
   RUNNER_TOKEN=<your-runner-token>
   ```
7. Rebuild services:
   ```bash
   sh infra/rebuild.sh
   ```

---

## Production vs Development

### Development Mode

Default configuration runs in development mode:

```bash
# Uses localhost URLs
VITE_API_URL=http://localhost:5000/api
VITE_GITEA_URL=http://localhost:3000
```

Access locally:
- Gitea: http://localhost:3000
- Backend API: http://localhost:5000/api
- API Docs: http://localhost:5000/api/docs
- Frontend: http://localhost:4173

### Production Mode

Update `.env` for production:

```bash
DOMAIN=terms.example.org
ROOT_URL=https://terms.example.org/
VITE_API_URL=https://terms.example.org/api
VITE_GITEA_URL=https://terms.example.org/
```

Rebuild with:

```bash
docker compose up -d --build
```

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
# Backup first
sh infra/backup.sh

# Pull changes
git pull origin main

# Rebuild
docker compose up -d --build
```

### Full Reset (Data Loss)

```bash
# Stop and wipe all data
sh infra/rebuild.sh --wipe
```

---

## Troubleshooting

### Blocked Host Error

**Symptom**: Browser shows "Blocked host" or similar error when accessing frontend.

**Solution**: Add your domain to `frontend/vite.config.ts` under `preview.allowedHosts`:

```typescript
allowedHosts: [
  'localhost',
  'your-domain.org',
],
```

Then rebuild: `docker compose up -d --build frontend`

### Port Conflicts

**Symptom**: "Port already in use" error.

**Solution**: Change ports in `docker-compose.yml` or stop conflicting services:

```bash
# Find what's using a port
lsof -i :3000

# Or change in docker-compose.yml:
ports:
  - "3001:3000"  # Map host 3001 to container 3000
```

### SSL Certificate Issues

**Symptom**: Certificate errors or HTTPS not working.

**Solution**:
1. Verify DNS is properly configured
2. Check reverse proxy logs
3. Ensure ports 80 and 443 are open
4. Wait for certificate propagation (can take a few minutes)

### Runner Connection Errors

**Symptom**: Runner shows "cannot connect to Gitea" errors.

**Solution**:

```bash
# Remove cached runner configuration
rm runner/.runner

# Restart runner
docker compose restart runner
```

### Workflow Jobs Cannot Access Gitea

**Symptom**: Jobs fail with "Could not resolve host: gitea".

**Solution**:

1. Ensure `runner/config.yaml` exists:
   ```bash
   cp runner/config.yaml.template runner/config.yaml
   ```
2. Verify it contains:
   ```yaml
   container:
     options: "--add-host=gitea:host-gateway"
   ```
3. Restart: `docker compose restart runner`

### Database Connection Errors

**Symptom**: Backend fails to connect to database.

**Solution**:

```bash
# Check Gitea health
docker compose logs gitea

# Verify PostgreSQL is running
docker compose logs db

# Wait for health check
docker compose ps
```

### Container Startup Order Issues

**Symptom**: Services fail because dependencies aren't ready.

**Solution**: The `docker-compose.yml` includes health checks. If issues persist:

```bash
# Start in dependency order
docker compose up -d db
docker compose up -d gitea
docker compose up -d backend frontend runner
```

### View All Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 gitea
```

---

## Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/marine-term-translations/mtt-self-host-platform/issues)
- **Documentation**: Check other docs in this repository
- **Gitea Actions**: See [Gitea Act Runner documentation](https://gitea.com/gitea/act_runner)
