#!/bin/bash
# Stop containers, optionally wipe Gitea and Postgres data, remove backend/frontend images, and restart

WIPE=0
if [[ "$1" == "--wipe" ]]; then
  WIPE=1
fi

docker compose down

if [[ $WIPE -eq 1 ]]; then
  echo "Wiping Gitea and Postgres data..."
  rm -rf gitea/data gitea/postgres
fi

docker rmi mtt-self-host-platform-backend mtt-self-host-platform-frontend || true
docker compose up -d
