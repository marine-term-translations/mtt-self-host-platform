#!/bin/bash
# Stop containers, optionally wipe database, remove backend/frontend images, and restart

WIPE=0
if [[ "$1" == "--wipe" ]]; then
  WIPE=1
fi

docker compose down

if [[ $WIPE -eq 1 ]]; then
  echo "⚠️  WARNING: Wiping database..."
  rm -rf backend/data
fi

docker rmi mtt-self-host-platform-backend mtt-self-host-platform-frontend || true
docker compose up -d --build
