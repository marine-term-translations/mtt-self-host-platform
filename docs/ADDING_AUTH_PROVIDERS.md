# Adding New Authentication Providers

## Overview

With the user ID migration complete, the platform is ready to support multiple authentication providers. This guide explains how to add new providers like GitHub, Google, or email/password authentication.

## Architecture

### auth_providers Table

The `auth_providers` table stores authentication credentials for each user-provider combination:

```sql
CREATE TABLE auth_providers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         TEXT    NOT NULL,  -- 'orcid', 'github', 'google', 'email'
    provider_id      TEXT    NOT NULL,  -- Provider-specific user ID
    email            TEXT,
    name             TEXT,
    avatar_url       TEXT,
    access_token     TEXT,
    refresh_token    TEXT,
    token_expires_at DATETIME,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider),           -- One provider per user
    UNIQUE(provider, provider_id)        -- One user per provider ID
);
```

### Key Constraints

1. **`UNIQUE(user_id, provider)`** - A user can only link each provider once
2. **`UNIQUE(provider, provider_id)`** - Each provider ID maps to exactly one user
3. **`ON DELETE CASCADE`** - Deleting a user removes all their auth providers

## Adding GitHub Authentication

### 1. Register OAuth Application

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth app with callback: `https://your-domain.org/api/auth/github/callback`
3. Save Client ID and Client Secret

### 2. Update Environment Variables

Add to `.env`:
```bash
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 3. Update config/index.js

```javascript
module.exports = {
  // ... existing config ...
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  },
};
```

### 4. Add Routes (auth.routes.js)

```javascript
// GitHub OAuth initiation
router.get("/auth/github", (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  req.session.state = state;
  
  const authUrl = `https://github.com/login/oauth/authorize?` +
    new URLSearchParams({
      client_id: config.github.clientId,
      redirect_uri: `${config.baseUrl}/api/auth/github/callback`,
      scope: 'read:user user:email',
      state,
    }).toString();

  res.redirect(authUrl);
});

// GitHub OAuth callback
router.get("/auth/github/callback", async (req, res) => {
  const { code, state: returnedState } = req.query;
  
  if (!code || returnedState !== req.session.state) {
    return res.redirect(`${config.frontendUrl}/login?error=invalid_state`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code,
        redirect_uri: `${config.baseUrl}/api/auth/github/callback`,
      },
      { 
        headers: { 
          Accept: 'application/json' 
        } 
      }
    );

    const { access_token } = tokenResponse.data;

    // Get user info from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { 
        Authorization: `Bearer ${access_token}` 
      }
    });

    const { id: githubId, login, name, avatar_url, email } = userResponse.data;

    const db = getDatabase();
    
    // Check if this GitHub account is already linked
    const existingAuth = db.prepare(
      'SELECT ap.*, u.* FROM auth_providers ap JOIN users u ON ap.user_id = u.id WHERE ap.provider = ? AND ap.provider_id = ?'
    ).get('github', githubId.toString());

    let userId;
    let username;
    let isNewUser = false;

    if (existingAuth) {
      // Existing GitHub user
      userId = existingAuth.user_id;
      username = existingAuth.username;
      
      // Update tokens
      db.prepare(
        'UPDATE auth_providers SET access_token = ?, updated_at = CURRENT_TIMESTAMP WHERE provider = ? AND provider_id = ?'
      ).run(access_token, 'github', githubId.toString());
    } else {
      // New GitHub user - create user account
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
      const isFirstUser = userCount.count === 0;
      
      const extra = JSON.stringify({
        name: name || login,
        is_admin: isFirstUser,
        registered_at: new Date().toISOString()
      });
      
      const userResult = db.prepare(
        'INSERT INTO users (username, reputation, extra) VALUES (?, ?, ?)'
      ).run(login, 0, extra);
      
      userId = userResult.lastInsertRowid;
      username = login;
      isNewUser = true;
      
      // Create auth_provider entry
      db.prepare(
        'INSERT INTO auth_providers (user_id, provider, provider_id, email, name, avatar_url, access_token) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(userId, 'github', githubId.toString(), email, name || login, avatar_url, access_token);
    }

    // Get user data for session
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const userExtra = JSON.parse(user.extra || '{}');

    // Store in session
    req.session.user = {
      id: userId,
      user_id: userId,
      username: username,
      name: name || login,
      access_token,
      is_admin: userExtra.is_admin || false,
      reputation: user.reputation,
      provider: 'github'
    };

    req.session.save((err) => {
      if (err) {
        console.error('[GitHub Callback] Session save error:', err);
        return res.redirect(`${config.frontendUrl}/login?error=session_failed`);
      }
      
      if (isNewUser) {
        res.redirect(`${config.frontendUrl}/#profile`);
      } else {
        res.redirect(`${config.frontendUrl}/#dashboard`);
      }
    });
  } catch (err) {
    console.error('[GitHub Callback] OAuth error:', err);
    res.redirect(`${config.frontendUrl}/login?error=github_failed`);
  }
});
```

### 5. Update Frontend

Add GitHub login button:

```typescript
// In Login component
<button onClick={() => window.location.href = `${API_URL}/auth/github`}>
  <GitHubIcon /> Sign in with GitHub
</button>
```

## Adding Google Authentication

Similar process to GitHub:

1. Register OAuth app at Google Cloud Console
2. Add environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
3. Add routes (`/auth/google` and `/auth/google/callback`)
4. Use Google OAuth 2.0 endpoints
5. Update frontend with Google sign-in button

## Adding Email/Password Authentication

For email/password, you'll need:

1. Password hashing library (e.g., bcrypt)
2. Email verification system
3. Password reset flow

Example:

```javascript
const bcrypt = require('bcrypt');

// Registration
router.post("/auth/register", async (req, res) => {
  const { email, password, username } = req.body;
  
  // Validate inputs
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const db = getDatabase();
    
    // Check if email already exists
    const existingAuth = db.prepare(
      'SELECT * FROM auth_providers WHERE provider = ? AND provider_id = ?'
    ).get('email', email);
    
    if (existingAuth) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = db.prepare(
      'INSERT INTO users (username, reputation, extra) VALUES (?, ?, ?)'
    ).run(username, 0, JSON.stringify({ email, registered_at: new Date().toISOString() }));

    const userId = userResult.lastInsertRowid;

    // Create auth provider entry
    // Note: For email/password, we store the hashed password in access_token field
    // This is a design choice to avoid adding password-specific columns
    // In production, consider adding a dedicated password_hash column or using a separate table
    db.prepare(
      'INSERT INTO auth_providers (user_id, provider, provider_id, email, access_token) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, 'email', email, email, hashedPassword);

    res.json({ success: true, userId });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const db = getDatabase();
    
    // Get auth provider entry
    const authProvider = db.prepare(
      'SELECT ap.*, u.* FROM auth_providers ap JOIN users u ON ap.user_id = u.id WHERE ap.provider = ? AND ap.provider_id = ?'
    ).get('email', email);

    if (!authProvider) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, authProvider.access_token);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session
    const userExtra = JSON.parse(authProvider.extra || '{}');
    
    req.session.user = {
      id: authProvider.user_id,
      user_id: authProvider.user_id,
      username: authProvider.username,
      name: authProvider.name || email,
      is_admin: userExtra.is_admin || false,
      reputation: authProvider.reputation,
      provider: 'email'
    };

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session failed' });
      }
      res.json({ success: true });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});
```

## Account Linking

Allow users to link multiple providers:

```javascript
// Link additional provider (user must be logged in)
router.post("/auth/link-provider", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { provider, provider_id, access_token } = req.body;
  const userId = req.session.user.id;

  try {
    const db = getDatabase();
    
    // Check if provider already linked
    const existing = db.prepare(
      'SELECT * FROM auth_providers WHERE user_id = ? AND provider = ?'
    ).get(userId, provider);

    if (existing) {
      return res.status(400).json({ error: 'Provider already linked' });
    }

    // Link provider
    db.prepare(
      'INSERT INTO auth_providers (user_id, provider, provider_id, access_token) VALUES (?, ?, ?, ?)'
    ).run(userId, provider, provider_id, access_token);

    res.json({ success: true });
  } catch (err) {
    console.error('Link provider error:', err);
    res.status(500).json({ error: 'Failed to link provider' });
  }
});
```

## Best Practices

1. **Always validate state parameter** - Prevents CSRF attacks
2. **Store tokens securely** - Consider encryption for access/refresh tokens
3. **Implement token refresh** - Refresh expired access tokens automatically
4. **Email verification** - For email/password, verify email addresses
5. **Rate limiting** - Protect auth endpoints from brute force
6. **Logging** - Log all authentication attempts for security
7. **Error handling** - Don't reveal whether email exists in error messages

## Testing

Test each provider:
1. New user registration
2. Existing user login
3. Account linking
4. Token refresh
5. Session management
6. Error cases (invalid credentials, expired tokens, etc.)

## Security Considerations

- Store access tokens encrypted or use short-lived tokens
- Implement refresh token rotation
- Use HTTPS in production
- Set secure session cookies
- Implement rate limiting on auth endpoints
- Log authentication attempts
- Implement account lockout after failed attempts
- Consider 2FA for sensitive operations
