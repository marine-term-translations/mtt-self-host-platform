# ORCID OAuth Configuration Guide

This guide explains how to configure ORCID OAuth authentication for the Marine Term Translations platform.

## Overview

The platform uses ORCID OAuth for secure, session-based authentication, providing:

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
      secure: true, // Always true in production with HTTPS
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  })
);
```

#### HTTPS
Ensure your production environment uses HTTPS. The `secure` cookie flag is automatically enabled when:
- `NODE_ENV=production` AND
- `BASE_URL` starts with `https://`

This prevents browsers from rejecting secure cookies over HTTP.

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

This occurs when the OAuth state parameter doesn't match between the initial request and callback.

**Debug steps:**
1. Check backend logs for session debugging output:
   ```bash
   docker logs marine-backend -f
   ```
   
2. Look for these log entries:
   - `[ORCID Auth] Generated state:` - Initial state value
   - `[ORCID Callback] Returned state from ORCID:` - State from callback
   - `[ORCID Callback] Expected state from session:` - State stored in session
   - `[Session Debug]` - Session persistence across requests
   - Compare Session IDs - they should be identical

3. **Common causes and fixes:**
   
   **A. Secure cookie over HTTP (most common)**
   - **Symptom:** Different Session IDs between auth start and callback, `secure: true` in logs but using HTTP
   - **Cause:** Browser rejects secure cookies over HTTP, creates new session on callback
   - **Fix:** Set `NODE_ENV=development` in `.env` for local development
   - **Verification:** Check logs for `[Session Debug] Cookie secure: false` when using HTTP
   
   **B. Session not persisting**
   - **Symptom:** Session ID differs between auth start and callback
   - **Fix:** Ensure cookies are enabled and `credentials: 'include'` is set on fetch calls
   - **Production fix:** Use Redis instead of MemoryStore (see below)
   
   **C. CORS/Cookie issues**
   - **Symptom:** No session cookie set
   - **Fix:** Verify `BASE_URL` and `FRONTEND_URL` in `.env` match actual URLs
   - **Fix:** Ensure `NODE_ENV` is correctly set for your environment
   
   **D. Redirect URI mismatch**
   - **Symptom:** ORCID returns error before state check
   - **Fix:** Verify ORCID app settings match `${BASE_URL}/api/auth/orcid/callback`
   - **Example:** `http://localhost:5000/api/auth/orcid/callback` for development

### Using Redis for Production Sessions

For production deployments, replace MemoryStore with Redis for session persistence:

1. Add Redis service to docker-compose.yml:
   ```yaml
   redis:
     image: redis:alpine
     restart: unless-stopped
     volumes:
       - redis-data:/data
   
   volumes:
     redis-data:
   ```

2. Install Redis client:
   ```bash
   npm install connect-redis redis
   ```

3. Update backend/src/app.js:
   ```javascript
   const RedisStore = require('connect-redis').default;
   const { createClient } = require('redis');
   
   const redisClient = createClient({
     url: process.env.REDIS_URL || 'redis://redis:6379'
   });
   redisClient.connect().catch(console.error);
   
   app.use(
     session({
       store: new RedisStore({ client: redisClient }),
       // ... rest of session config
     })
   );
   ```

### Disabling Debug Logs

The logging added for debugging is automatically disabled in production (`NODE_ENV=production`). To disable in development, comment out the session debugging middleware in `backend/src/app.js`.

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

## Support

For issues or questions:
- Check the [ORCID API documentation](https://info.orcid.org/documentation/api-tutorials/)
- Review backend logs: `docker compose logs backend`
- Open an issue in the repository
