# Docker Container Admin Control

This document describes the Docker container management feature for admin users in the Marine Term Translations platform.

## Overview

Admin users can now monitor and control Docker containers running in the platform, specifically the LDES consumer containers. This feature provides visibility into container status, logs, and allows restarting containers when needed.

## Features

### 1. Container Status Monitoring

For LDES sources, the source detail page displays the status of the associated Docker container:
- Container name (format: `ldes-consumer-source_{id}`)
- Running/Stopped status
- Container state information
- Creation timestamp

### 2. Container Logs

Admin users can view the most recent logs from containers:
- View last 200 lines of logs by default
- Logs include timestamps
- Modal dialog for easy reading
- Real-time log fetching

### 3. Container Restart

Admin users can restart LDES consumer containers:
- Restart button available on source detail page
- Automatic restart after updating LDES feed configuration
- Confirmation of successful restart

## API Endpoints

All Docker API endpoints are protected and only accessible to admin users.

### List All Containers
```
GET /api/admin/docker/containers
```
Returns a list of all Docker containers with basic information.

**Response:**
```json
{
  "containers": [
    {
      "id": "abc123def456",
      "name": "marine-backend",
      "image": "marine-backend:latest",
      "state": "running",
      "status": "Up 2 hours",
      "created": 1707561234
    }
  ],
  "total": 1
}
```

### Get Container Details
```
GET /api/admin/docker/containers/:name
```
Returns detailed information about a specific container.

**Parameters:**
- `name` - Container name or ID

**Response:**
```json
{
  "id": "abc123def456...",
  "name": "marine_ldes_consumer",
  "image": "kgap_ldes-consumer:latest",
  "state": {
    "Running": true,
    "Paused": false,
    "Pid": 12345,
    "ExitCode": 0,
    "StartedAt": "2026-02-10T10:00:00Z"
  },
  "status": "Up 2 hours",
  "created": "2026-02-10T08:00:00Z"
}
```

### Get Container Logs
```
GET /api/admin/docker/containers/:name/logs?tail=100&timestamps=true
```
Retrieves logs from a container.

**Parameters:**
- `name` - Container name or ID
- `tail` (optional) - Number of lines to retrieve (default: 100)
- `timestamps` (optional) - Include timestamps (default: true)

**Response:**
```json
{
  "container": "marine_ldes_consumer",
  "logs": "2026-02-10T10:00:00.123Z Starting LDES consumer...\n2026-02-10T10:00:01.456Z Connected to GraphDB\n...",
  "tail": 100
}
```

### Restart Container
```
POST /api/admin/docker/containers/:name/restart
```
Restarts a container.

**Parameters:**
- `name` - Container name or ID

**Response:**
```json
{
  "success": true,
  "message": "Container marine_ldes_consumer restarted successfully",
  "container": "marine_ldes_consumer"
}
```

## Container Naming Convention

### LDES Consumer Containers

Individual LDES consumer containers for each source follow this naming pattern:
```
ldes-consumer-source_{source_id}
```

For example:
- Source ID 1: `ldes-consumer-source_1`
- Source ID 42: `ldes-consumer-source_42`

### Main LDES Consumer

The main LDES consumer container is named:
```
marine_ldes_consumer
```

This container is automatically restarted when the `ldes-feeds.yaml` configuration file is updated.

## Usage

### Viewing Container Status

1. Navigate to **Admin Dashboard** → **Data Sources**
2. Click on an LDES source
3. Scroll to the **LDES Consumer Container** section
4. View the container status, including:
   - Container name
   - Running/Stopped status
   - Detailed state information

### Viewing Container Logs

1. On the source detail page, click **View Logs** in the container section
2. A modal will open displaying the most recent container logs
3. Review the logs for debugging or monitoring purposes
4. Click **Close** when finished

### Restarting a Container

1. On the source detail page, click **Restart Container** in the container section
2. Wait for the restart confirmation message
3. The page will automatically refresh the container status

## Automatic Container Restart

When you create or update an LDES source:

1. The system updates the `ldes-feeds.yaml` configuration file
2. Automatically restarts the main LDES consumer container (`marine_ldes_consumer`)
3. The LDES consumer picks up the new configuration
4. Individual source containers are spawned as needed

## Security

All Docker container operations are:
- Protected by admin authentication (`requireAdmin` middleware)
- Only accessible to users with admin privileges
- Limited to read and restart operations (no delete or create)
- Logged for audit purposes

## Docker Socket Access

The backend container requires access to the Docker socket to manage containers:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

This is configured in `docker-compose.yml` and is necessary for container management.

## Configuration

### Environment Variables

The following environment variable can be used to customize the LDES consumer container name:

```bash
LDES_CONSUMER_CONTAINER=marine_ldes_consumer
```

Default value: `marine_ldes_consumer`

### Docker Socket Path

The Docker socket path is configured in `backend/src/config/docker.js`:

```javascript
const DOCKER_SOCKET_PATH = '/var/run/docker.sock';
```

## Troubleshooting

### Container Not Found

If the container status shows "Container not found":
- Verify the LDES consumer is running: `docker ps | grep ldes-consumer`
- Check if the container name matches the expected pattern
- Review the LDES consumer logs for startup errors

### Permission Denied

If you see "Permission denied" errors:
- Ensure the backend container has access to the Docker socket
- Check the volume mount in `docker-compose.yml`
- Verify the backend container user has permissions to access `/var/run/docker.sock`

### Cannot Restart Container

If container restart fails:
- Check if you have admin privileges
- Verify the container exists and is accessible
- Review the backend logs for detailed error messages
- Ensure the Docker daemon is running

## Technical Details

### Dependencies

- **dockerode** (^4.0.2) - Node.js Docker client library
- Requires access to Docker socket at `/var/run/docker.sock`

### Architecture

```
Frontend (Admin UI)
    ↓ (HTTP/REST)
Backend API (Express)
    ↓ (requireAdmin middleware)
Docker Routes
    ↓
Docker Service
    ↓ (Unix socket)
Docker Daemon
    ↓
Containers
```

### Files Modified/Added

- `backend/package.json` - Added dockerode dependency
- `backend/src/config/docker.js` - Docker configuration constants
- `backend/src/services/docker.service.js` - Docker operations service
- `backend/src/routes/docker.routes.js` - Docker API endpoints
- `backend/src/routes/sources.routes.js` - Container status integration
- `backend/src/app.js` - Route registration
- `frontend/pages/admin/AdminSourceDetail.tsx` - Container UI components

## Future Enhancements

Potential improvements for this feature:
- Container metrics (CPU, memory usage)
- Container creation/deletion from UI
- Batch operations on multiple containers
- Real-time log streaming
- Container health checks
- Automated container recovery
