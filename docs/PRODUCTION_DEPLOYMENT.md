# Production Deployment Guide

This guide explains how to deploy the Marine Term Translations platform to production at `https://mtt.vliz.be`.

## Frontend Configuration for Production Backend

The frontend is already configured to work with any backend URL via the `VITE_API_URL` environment variable. No code changes are needed!

### Step 1: Update Environment Variables

In your `.env` file, set the production backend URL:

```env
# Frontend environment variable - tells browser where to find the backend
VITE_API_URL=https://mtt.vliz.be/api
VITE_DOMAIN=mtt.vliz.be
VITE_ROOT_URL=https://mtt.vliz.be

# Backend environment variables
NODE_ENV=production
BASE_URL=https://mtt.vliz.be
FRONTEND_URL=https://mtt.vliz.be
SESSION_SECRET=<your-secure-random-string>
ORCID_CLIENT_ID=<your-orcid-client-id>
ORCID_CLIENT_SECRET=<your-orcid-client-secret>
```

### Step 2: Rebuild Frontend Container

The frontend needs to be rebuilt with the new environment variable:

```bash
docker compose build frontend
docker compose up -d
```

### How It Works

The frontend uses `CONFIG.API_URL` from `frontend/config.ts` for all API calls:

```typescript
// frontend/config.ts
export const CONFIG = {
  API_URL: getEnv('VITE_API_URL', 'http://localhost:5000/api'),
  // ...
}
```

This value is used in:
- **AuthContext**: `${CONFIG.API_URL}/auth/orcid`, `${CONFIG.API_URL}/me`, `${CONFIG.API_URL}/logout`
- **API Service**: All backend API calls via `backendApi`

### URL Structure

With `VITE_API_URL=https://mtt.vliz.be/api`, the frontend will call:

- Login: `https://mtt.vliz.be/api/auth/orcid`
- Callback: `https://mtt.vliz.be/api/auth/orcid/callback` (ORCID redirects here)
- Session check: `https://mtt.vliz.be/api/me`
- Logout: `https://mtt.vliz.be/api/logout`
- Terms: `https://mtt.vliz.be/api/terms`
- etc.

## Backend Configuration

Ensure your backend is configured to handle requests at `https://mtt.vliz.be/api/`:

### Step 1: Update Backend Environment

```env
NODE_ENV=production
BASE_URL=https://mtt.vliz.be
FRONTEND_URL=https://mtt.vliz.be
```

### Step 2: ORCID OAuth Configuration

Register your OAuth app at https://orcid.org/developer-tools with:

**Redirect URI:** `https://mtt.vliz.be/api/auth/orcid/callback`

This must match exactly (including the `/api` prefix).

### Step 3: Reverse Proxy Configuration

Your reverse proxy (nginx, Traefik, Caddy, etc.) should route:

- `https://mtt.vliz.be/api/*` → backend container port 5000
- `https://mtt.vliz.be/*` → frontend container port 4173

Example nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name mtt.vliz.be;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Backend API routes
    location /api/ {
        proxy_pass http://backend:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ORCID auth routes (also go to backend)
    location /auth/ {
        proxy_pass http://backend:5000/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend static files
    location / {
        proxy_pass http://frontend:4173/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Verification Checklist

After deployment, verify:

- [ ] Frontend loads at `https://mtt.vliz.be`
- [ ] Click "Sign in with ORCID" redirects to ORCID
- [ ] After ORCID login, redirected back to `https://mtt.vliz.be`
- [ ] User session persists across page refreshes
- [ ] API calls (terms, translations) work
- [ ] Logout works correctly
- [ ] Browser console shows no CORS errors
- [ ] Browser console shows API calls going to `https://mtt.vliz.be/api/*`

## Troubleshooting

### Frontend can't reach backend

**Symptom:** Network errors, CORS errors, or 404s

**Solution:** Check that `VITE_API_URL` is set correctly and frontend was rebuilt:
```bash
# Check current value in running container
docker compose exec frontend env | grep VITE_API_URL

# Rebuild if needed
docker compose build frontend
docker compose up -d frontend
```

### ORCID callback fails

**Symptom:** Redirect to `/login?error=invalid_state`

**Solution:** 
1. Ensure `BASE_URL` in backend matches the domain: `BASE_URL=https://mtt.vliz.be`
2. Check ORCID redirect URI is: `https://mtt.vliz.be/api/auth/orcid/callback`
3. Verify `NODE_ENV=production` is set (for secure cookies over HTTPS)

### Session doesn't persist

**Symptom:** Logged out after page refresh

**Solution:**
1. Ensure `NODE_ENV=production` (enables secure cookies)
2. Check that cookies are being set (browser DevTools > Application > Cookies)
3. Verify cookie domain matches `mtt.vliz.be`
4. Consider using Redis for session storage in production

## Summary

**What you need to change in the frontend:**

Just set the environment variable in `.env`:
```env
VITE_API_URL=https://mtt.vliz.be/api
```

Then rebuild:
```bash
docker compose build frontend
docker compose up -d frontend
```

**No code changes needed** - the frontend is already designed to work with any backend URL via `CONFIG.API_URL`!
