# Gitea Actions Runner

This folder contains configuration and data for the Gitea Actions runner.

## What you can do here

- Configure the runner by editing `config.yaml` (auto-generated on first start)
- Store runner-specific secrets or tokens if needed
- View runner logs and status files
- Reset runner state by deleting files in this folder (if troubleshooting)
- Use this folder as the persistent volume for the runner container in Docker Compose

**Note:** The runner enables CI/CD workflows for your Gitea repositories.

## Troubleshooting

### Runner cannot connect to Gitea

If you see an error like:

```
fail to invoke Declare: unavailable: dial tcp: lookup host.docker.internal on 127.0.0.11:53: no such host
```

This means the runner has a cached `.runner` file with an old Gitea address. To fix this:

1. Stop the runner: `docker compose stop runner`
2. Delete the cached configuration: `rm runner/.runner`
3. Restart the runner: `docker compose up -d runner`

The runner will re-register with Gitea using the correct URL from `GITEA_INSTANCE_URL`.
