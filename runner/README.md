# Gitea Actions Runner

This folder contains configuration and data for the Gitea Actions runner.

## Initial Setup

Before starting the runner for the first time, copy the config template:

```bash
cp runner/config.yaml.template runner/config.yaml
```

The config.yaml adds `--add-host=gitea:host-gateway` to job containers, allowing them to resolve the `gitea` hostname to the Docker host IP.

## What you can do here

- Configure the runner by editing `config.yaml`
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

### Workflow jobs cannot access Gitea

If workflow jobs fail with errors like:

```
fatal: unable to access 'http://gitea:3000/...': Could not resolve host: gitea
```

This means the job containers cannot resolve the `gitea` hostname. To fix this:

1. Copy the config template: `cp runner/config.yaml.template runner/config.yaml`
2. Verify the config has `options: "--add-host=gitea:host-gateway"`
3. Restart the runner: `docker compose restart runner`

The `--add-host=gitea:host-gateway` option maps the `gitea` hostname to the Docker host IP in job containers.
