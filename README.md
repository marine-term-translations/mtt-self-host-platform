# marine-term-translations/platform

Production-ready monorepo for marine term translations platform.

## Structure

```
marine-term-translations/platform/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── backend/
│   └── ... (Node backend app)
├── frontend/
│   └── ... (React/Vite frontend app)
├── gitea/
│   ├── data/
│   └── custom/conf/app.ini
├── runner/
│   └── config.yaml
├── backups/
├── infra/
│   ├── backup.sh
│   ├── restore.sh
│   └── push-mirror-setup.sh
└── templates/
    └── translation-repo/
        ├── terms.yaml
        └── README.md
```

## Quick Start

1. Clone the repo:
   ```
   git clone https://github.com/marine-term-translations/mtt-self-host-platform.git
   cd mtt-self-host-platform
   ```
2. Copy and edit environment:
   ```
   cp .env.example .env
   # Edit .env with your domain & other settings
   ```
3. Deploy:
   ```
   docker compose up -d
   ```

---

## Post-Deployment: Admin Setup & Token Configuration

After running `docker compose up -d`, follow these steps to complete your admin setup:

1. **Create the Admin Account**
   - Go to `https://terms.yourdomain.org` in your browser.
   - Register the first admin account using the credentials from your `.env` file:
     - **Username:** `GITEA_ADMIN_USER`
     - **Password:** `GITEA_ADMIN_PASS`
     - **Email:** `GITEA_ADMIN_EMAIL`
   - Complete registration and log in as admin.

2. **Generate the Admin Token**
   - Once logged in, go to your Gitea user settings → "Applications" → "Generate New Token".
   - Name the token (e.g., `admin-api-token`) and copy the generated value.

3. **Update `.env` with the Admin Token**
   - Open your `.env` file.
   - Paste the token value into `GITEA_ADMIN_TOKEN=`.

---

4. **Restart the Services**
   - Run:
     ```
     docker compose restart
     ```
   - This reloads the backend and runner with the new token(s).

---

5. **Run infra scripts for setup**
   - Run the following commands to set up backups and push mirror:
     ```
     sh ./infra/setup-gitea.sh
     ```
---

6. **Register the Runner**

To enable automated runner actions, follow the official instructions:  
See [Gitea Act Runner documentation](https://gitea.com/gitea/act_runner).

1. Log in to Gitea as admin and goto the translations repo.
2. Go to **Actions** → **Runners**.
3. Click **Register Runner**.
4. Enter a name and description, then click **Generate Token**.
5. Copy the token and add it to your `.env` file as `RUNNER_TOKEN=`.
6. run sh infra/rebuild.sh to restart the runner with the new token.
---



Your platform is now fully configured for admin access and automation.

In 3–5 minutes you have:
- https://terms.yourdomain.org → Gitea login (create first admin)
- https://terms.yourdomain.org/api/docs → backend
- https://terms.yourdomain.org/app → frontend
- Automatic Let’s Encrypt SSL
- Runner ready for LDES fragment actions
- Full source-of-truth sovereignty

## License

MIT
