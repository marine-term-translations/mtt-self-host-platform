#!/bin/bash
# Stop containers, remove backend/frontend images, and restart

docker compose down
docker rmi self-host-platform-backend self-host-platform-frontend || true
docker compose up -d
