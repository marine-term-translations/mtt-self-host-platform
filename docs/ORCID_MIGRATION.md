# ORCID OAuth Migration Guide

This guide explains how to migrate from Gitea-based authentication to ORCID OAuth authentication.

## Overview

The platform now uses ORCID OAuth for secure, session-based authentication instead of Gitea username/password authentication. This provides:

- **Secure authentication** via ORCID's trusted identity provider
- **No password management** - credentials stay with ORCID
- **Session-based security** - HttpOnly, Secure, SameSite cookies
- **Persistent researcher identity** - ORCID iD is globally recognized

## Prerequisites

1. **Register your OAuth application with ORCID:**
   - Go to https://orcid.org/developer-tools
   - Create a new application
   - Set the redirect URI to: `https://mtt.vliz.be/api/auth/orcid/callback`
   - Note down the Client ID and Client Secret

2. **Generate a secure session secret:**
   ```bash
   # Generate a random 64-character hex string
   openssl rand -hex 32
   ```

## Configuration Steps

### 1. Update Environment Variables

Add the following to your `.env` file:

```env
# ORCID OAuth Configuration
ORCID_CLIENT_ID=APP-XXXXXXXXXXXXXXXX
ORCID_CLIENT_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SESSION_SECRET=your-super-long-random-string-here

# Production URLs
BASE_URL=https://mtt.vliz.be
FRONTEND_URL=https://mtt.vliz.be
```

For development:
```env
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

### 2. Install Dependencies

The following new dependencies are required:

```bash
cd backend
npm install
```

New packages:
- `express-session` - Session management
- `memorystore` - In-memory session store (use Redis in production)

### 3. Production Considerations

#### Session Store
For production, replace MemoryStore with Redis:

```bash
npm install connect-redis redis
```

Update `backend/src/app.js`:
```javascript
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect();

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  })
);
```

#### HTTPS
Ensure your production environment uses HTTPS. The `secure` cookie flag is automatically enabled in production mode.

### 4. Deploy Changes

```bash
# Rebuild containers
docker compose down
docker compose up -d --build
```

## API Changes

### New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/orcid` | GET | Initiates ORCID OAuth flow |
| `/api/auth/orcid/callback` | GET | ORCID OAuth callback |
| `/api/me` | GET | Get current authenticated user |
| `/api/logout` | POST | Logout current user |

### Deprecated Endpoints

The following endpoints are deprecated but remain for backward compatibility:

| Endpoint | Method | Status |
|----------|--------|--------|
| `/api/login-gitea` | POST | Deprecated |
| `/api/check-admin` | POST | Deprecated |

## User Experience Changes

### Login Flow
1. User clicks "Sign in with ORCID"
2. Redirected to ORCID authorization page
3. User approves authorization
4. Redirected back to application dashboard
5. Session cookie is set (HttpOnly, Secure, SameSite)

### Registration Flow
1. User clicks "Register with ORCID"
2. Same flow as login
3. If first time logging in, user is automatically registered

### Session Management
- Sessions last 30 days by default
- Sessions are stored server-side
- Only a session ID cookie is sent to the browser
- No tokens or credentials are exposed to JavaScript

## Security Features

1. **Cryptographically secure state parameter** - Uses `crypto.randomBytes()` for OAuth state
2. **HttpOnly cookies** - Session cookies cannot be accessed by JavaScript
3. **Secure cookies** - Cookies only sent over HTTPS in production
4. **SameSite cookies** - Protection against CSRF attacks
5. **Error handling** - Proper error handling for session operations

## Troubleshooting

### Issue: "Invalid state" error
- **Cause:** State parameter mismatch or session expired during OAuth flow
- **Solution:** Try logging in again. Ensure cookies are enabled in browser.

### Issue: "ORCID authentication failed"
- **Cause:** OAuth token exchange failed
- **Solution:** Check ORCID_CLIENT_ID and ORCID_CLIENT_SECRET in .env file

### Issue: "Not authenticated" after login
- **Cause:** Session not being stored or retrieved
- **Solution:** Check session store configuration. In production, ensure Redis is running.

### Issue: CORS errors
- **Cause:** Frontend URL mismatch
- **Solution:** Ensure FRONTEND_URL in backend .env matches your actual frontend URL

## Migration Checklist

- [ ] Register OAuth app with ORCID
- [ ] Add ORCID credentials to .env
- [ ] Generate and add SESSION_SECRET to .env
- [ ] Update BASE_URL and FRONTEND_URL in .env
- [ ] Install backend dependencies (npm install)
- [ ] Consider Redis for production session storage
- [ ] Ensure HTTPS is enabled in production
- [ ] Test login flow in development
- [ ] Deploy to production
- [ ] Test login flow in production
- [ ] Communicate changes to users

## Rollback Plan

If you need to rollback:

1. Revert to the previous commit before ORCID changes
2. Redeploy containers: `docker compose up -d --build`
3. Users can continue using Gitea authentication

## Support

For issues or questions:
- Check the [ORCID API documentation](https://info.orcid.org/documentation/api-tutorials/)
- Review backend logs: `docker compose logs backend`
- Open an issue in the repository
