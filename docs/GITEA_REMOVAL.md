# Gitea Removal Documentation

This document details everything that was removed when Gitea integration was eliminated from the Marine Term Translations platform, and describes the functionality that may no longer work as a result.

## Summary

All Gitea-related code, services, and integrations have been completely removed from the platform. Authentication is now handled exclusively through ORCID OAuth, and the platform operates as a standalone application without external Git repository management.

---

## Files Removed

### Backend Services
- **`backend/src/services/gitea.service.js`** - Complete Gitea API client
  - Functions removed:
    - `createOrganization()` - Create Gitea organization
    - `loginUser()` - Authenticate user via Gitea
    - `checkAdminStatus()` - Verify admin permissions
    - `createUser()` - Create Gitea users
    - `getOrgTeams()` - Fetch organization teams
    - `createTeam()` - Create language teams
    - `addUserToTeam()` - Add users to teams
    - `isUserInTeam()` - Check team membership

- **`backend/src/services/git.service.js`** - Git repository operations
  - Functions removed:
    - `cloneRepo()` - Clone translations repository
    - `pullRepo()` - Pull latest changes
    - `configureGitUser()` - Set Git user config
    - `addFiles()` - Stage changes
    - `commit()` - Create commits
    - `push()` - Push to remote
    - `syncRepo()` - Clone and pull
    - `commitAndPush()` - Commit and push workflow

### Backend Routes
- **`backend/src/routes/gitea.routes.js`** - Gitea setup and registration endpoints
  - Endpoints removed:
    - `POST /api/setup-gitea` - Initialize Gitea organization
    - `POST /api/register-gitea-user` - Register user in Gitea and assign to teams

### Docker Services
From `docker-compose.yml`:
- **`gitea`** service - Gitea server container
- **`db`** service - PostgreSQL database for Gitea
- **`runner`** service - Gitea Actions CI/CD runner

### Configuration
- All `GITEA_*` environment variables from `.env.example`:
  - `GITEA_URL`
  - `GITEA_TOKEN`
  - `GITEA_ADMIN_TOKEN`
  - `GITEA_ADMIN_USER`
  - `GITEA_ADMIN_EMAIL`
  - `GITEA_ADMIN_PASS`
  - `GITEA_ORG_NAME`
  - `GITEA_ORG_FULL_NAME`
  - `GITEA_ORG_DESCRIPTION`
  - `GITEA_ORG_EMAIL`
  - `GITEA_ORG_LOCATION`
  - `GITEA_ORG_VISIBILITY`
  - `GITEA_ORG_WEBSITE`
  - `GITEA_DB_PASS`
- `RUNNER_TOKEN` environment variable
- `RUNNER_NAME` environment variable

### Frontend
- `VITE_GITEA_URL` from frontend config
- `CONFIG.GITEA_URL` from `frontend/config.ts`
- `giteaApi` export from `frontend/services/api.ts`

---

## Code Modifications

### Backend Configuration (`backend/src/config/index.js`)
**Removed:**
- Entire `gitea` configuration object
- `config.translations.repoUrl` construction (was using Gitea credentials)

**Impact:**
- No Gitea URL or credentials available
- Cannot construct authenticated Git repository URLs

### Backend Routes

#### `backend/src/routes/auth.routes.js`
**Removed:**
- `POST /api/login-gitea` - Deprecated Gitea username/password login
- `POST /api/check-admin` - Deprecated Gitea token admin verification
- Import of `giteaService`

**Impact:**
- Cannot login with Gitea credentials
- Cannot verify admin status via Gitea tokens
- Must use ORCID OAuth for all authentication

#### `backend/src/routes/teams.routes.js`
**Modified:**
- `GET /api/user-teams` now returns empty array `[]`
- Removed `giteaService` import
- Removed Gitea team lookups

**Impact:**
- Team management functionality disabled
- Language team assignments no longer work
- Endpoint kept for backward compatibility but returns no teams

#### `backend/src/routes/appeals.routes.js`
**Modified:**
- `POST /api/appeals` - Replaced Gitea token auth with ORCID session auth
- `PATCH /api/appeals/:id` - Replaced Gitea token auth with ORCID session auth
- Removed `checkAdminStatus()` calls
- Removed Git commit/push after appeal operations
- Removed `token` parameter requirement

**Impact:**
- Appeals no longer versioned in Git
- Admin verification now based on session authentication
- Cannot verify user identity via Gitea tokens

#### `backend/src/routes/terms.routes.js`
**Modified:**
- `PUT /terms/:id` - Replaced Gitea token auth with ORCID session auth
- Removed `checkAdminStatus()` calls
- Removed Git pull before updates
- Removed Git commit/push after updates
- Removed `token` parameter requirement

**Impact:**
- Term changes no longer versioned in Git
- No conflict resolution via Git pulls
- Changes stored in SQLite database only
- Cannot track change history via Git commits

### Frontend API Service
**Modified:**
- Removed `giteaApi` instance
- Removed `CONFIG.GITEA_URL` reference

**Impact:**
- Cannot make API calls to Gitea
- Frontend has no direct Gitea integration

---

## Functionality No Longer Available

### 1. Git-Based Version Control ❌
**What was removed:**
- Automatic Git commits for database changes
- Push to remote Gitea repository
- Pull before updates (conflict detection)
- Change history via Git log
- Repository cloning on startup

**Impact:**
- **No version history** - Changes are not tracked in Git
- **No collaboration features** - Cannot see who changed what via Git
- **No rollback capability** - Cannot revert to previous versions via Git
- **Single source of truth** - SQLite database is the only data store

**Workaround:**
- Implement application-level audit logging
- Add database triggers to track changes
- Export database backups regularly
- Consider implementing manual versioning

### 2. Team Management ❌
**What was removed:**
- Language-based team creation
- Team membership management
- Team permissions via Gitea

**Impact:**
- **No language teams** - Cannot organize users by language proficiency
- **No team-based access control** - Cannot restrict access by team
- **GET /api/user-teams returns empty** - Existing code won't break but returns no teams

**Workaround:**
- Implement application-level team management
- Add `teams` table to SQLite database
- Create team CRUD endpoints
- Store team membership in database

### 3. CI/CD Workflows ❌
**What was removed:**
- Gitea Actions runner
- Automated workflows on Git events
- Continuous integration pipelines

**Impact:**
- **No automated testing** - Cannot run tests on push
- **No automated deployment** - Cannot deploy automatically
- **No workflow automation** - Cannot trigger actions on events

**Workaround:**
- Use external CI/CD (GitHub Actions, GitLab CI, Jenkins)
- Implement application-level webhooks
- Create manual deployment scripts

### 4. User Registration via Gitea ❌
**What was removed:**
- Gitea user account creation
- Username/password authentication
- Gitea-based user profiles

**Impact:**
- **ORCID only** - Must have ORCID iD to use platform
- **No local accounts** - Cannot create username/password accounts
- **No Gitea integration** - User data stored locally only

**Replacement:**
- ORCID OAuth provides authentication
- User data stored in SQLite `users` table
- ORCID iD used as unique identifier

### 5. Admin User Management ❌
**What was removed:**
- Gitea admin status checks
- Token-based admin verification
- Gitea user permissions

**Impact:**
- **No admin role** - Cannot distinguish admin users
- **No permission system** - All authenticated users have equal access
- **Security concern** - Need new admin system

**Workaround:**
- Add `is_admin` column to `users` table
- Create admin management endpoints
- Implement role-based access control (RBAC)
- Use middleware to check admin status

### 6. Organization Management ❌
**What was removed:**
- Gitea organization setup
- Organization metadata
- Organization-level permissions

**Impact:**
- **No organization structure** - Cannot group users
- **No org-level settings** - Cannot configure at org level

**Workaround:**
- Not critical for core functionality
- Can implement if multi-tenancy needed

---

## What Still Works ✅

### Core Functionality
- ✅ **ORCID Authentication** - Login/logout via ORCID OAuth
- ✅ **User Sessions** - Session management with HttpOnly cookies
- ✅ **Terms Management** - Create, read, update, delete terms
- ✅ **Translations** - Manage term translations
- ✅ **Appeals System** - Create and manage appeals (session auth)
- ✅ **Reputation System** - User reputation tracking
- ✅ **Database Operations** - All SQLite database operations
- ✅ **Frontend UI** - All React components and pages
- ✅ **API Endpoints** - Most endpoints work (except team-related)

### Modified Behavior
- ⚠️ **Admin Checks** - Now use session auth instead of Gitea tokens
- ⚠️ **User Identification** - Now use ORCID iD instead of Gitea username
- ⚠️ **Change Tracking** - Database-only (no Git history)

---

## Migration Path

If you need features that were removed:

### 1. Version Control
**Option A:** External Git Repository
```bash
# Manually initialize Git in translations data directory
cd backend/translations-data
git init
git remote add origin <your-git-repo-url>
```

**Option B:** Application-Level Versioning
- Add `version` column to tables
- Create `change_history` table
- Log all modifications

### 2. Team Management
Create new tables:
```sql
CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_members (
  team_id INTEGER,
  user_orcid TEXT,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (user_orcid) REFERENCES users(username)
);
```

### 3. Admin System
Add admin column:
```sql
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;
```

Create admin middleware:
```javascript
function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const db = getDatabase();
  const user = db.prepare('SELECT is_admin FROM users WHERE username = ?')
    .get(req.session.user.orcid);
    
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}
```

### 4. CI/CD Alternative
**Option A:** GitHub Actions
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: docker compose up -d --build
```

**Option B:** Webhook-Based Deployment
Create webhook endpoint that triggers deployment on external events.

---

## Breaking Changes for Existing Users

### API Changes
1. **Authentication Endpoints**
   - ❌ `POST /api/login-gitea` - Removed
   - ❌ `POST /api/check-admin` - Removed
   - ❌ `POST /api/setup-gitea` - Removed
   - ❌ `POST /api/register-gitea-user` - Removed
   - ✅ `GET /api/auth/orcid` - Use this instead
   - ✅ `GET /api/me` - Check session auth

2. **Request Body Changes**
   - Appeals endpoints: `token` parameter removed
   - Terms endpoints: `token` parameter removed
   - Now relies on session cookies instead

3. **Team Endpoints**
   - `GET /api/user-teams` - Now returns empty array `[]`

### Environment Variables
All `GITEA_*` variables must be removed from `.env` file. See `.env.example` for current required variables.

### Docker Compose
Three services removed:
- No more Gitea on port 3000
- No more PostgreSQL database
- No more Actions runner

Only `backend` (port 5000) and `frontend` (port 4173) remain.

---

## Recommendations

### Immediate Actions
1. ✅ **Update `.env`** - Remove all Gitea variables
2. ✅ **Rebuild containers** - `docker compose up -d --build`
3. ✅ **Test authentication** - Ensure ORCID login works
4. ✅ **Test core features** - Terms, translations, appeals

### Future Enhancements
1. **Implement admin system** - Add role-based access control
2. **Add change tracking** - Application-level audit log
3. **Consider teams** - If language-based organization needed
4. **Backup strategy** - Regular SQLite database exports
5. **Monitoring** - Add logging and error tracking

### Optional Migrations
- **Keep Git versioning** - Mount external Git repository
- **External CI/CD** - Use GitHub Actions or similar
- **Multi-tenancy** - If supporting multiple organizations

---

## Support

For questions or issues related to Gitea removal:
1. Check this document for removed functionality
2. Review `docs/ORCID_MIGRATION.md` for ORCID setup
3. Check the codebase for session-based auth examples
4. Open an issue if functionality is critical

---

## Summary Table

| Feature | Before | After | Mitigation |
|---------|--------|-------|------------|
| Authentication | Gitea username/password | ORCID OAuth | None needed - better security |
| User Management | Gitea accounts | ORCID iD + SQLite | Session-based auth |
| Admin Checks | Gitea tokens | Session auth | Need to implement RBAC |
| Teams | Gitea teams | None | Implement in database |
| Version Control | Git commits | Database only | Manual Git or app versioning |
| CI/CD | Gitea Actions | None | External CI/CD platform |
| Change History | Git log | None | Implement audit log |
| Organization | Gitea org | None | Not needed for single instance |

---

## Conclusion

The Gitea removal simplifies the architecture significantly, reducing from 5 Docker services to 2. Authentication is now more secure via ORCID OAuth. However, some features (teams, Git versioning, CI/CD) will need to be implemented at the application level if required.

The platform is fully functional for core translation management, but extended features like team organization and change history will require new implementation approaches.
