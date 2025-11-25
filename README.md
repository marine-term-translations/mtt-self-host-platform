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
├── nginx/
│   ├── nginx.conf
│   └── certbot/
│       ├── conf/
│       └── www/
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
   git clone https://github.com/marine-term-translations/platform.git
   cd platform
   ```
2. Copy and edit environment:
   ```
   cp .env.example .env
   # Edit .env with your domain & tokens
   ```
3. Deploy:
   ```
   docker compose up -d
   ```

In 3–5 minutes you have:
- https://terms.yourdomain.org → Gitea login (create first admin)
- https://terms.yourdomain.org/api/docs → backend
- https://terms.yourdomain.org/app → frontend
- Automatic Let’s Encrypt SSL
- Runner ready for LDES fragment actions
- Full source-of-truth sovereignty

## License

MIT
