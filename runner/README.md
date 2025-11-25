# Gitea Actions Runner

This folder contains configuration and data for the Gitea Actions runner.

## What you can do here

- Configure the runner by editing `config.yaml` (auto-generated on first start)
- Store runner-specific secrets or tokens if needed
- View runner logs and status files
- Reset runner state by deleting files in this folder (if troubleshooting)
- Use this folder as the persistent volume for the runner container in Docker Compose

**Note:** The runner enables CI/CD workflows for your Gitea repositories.
