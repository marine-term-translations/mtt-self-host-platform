#!/bin/bash
# Trigger Gitea setup via backend API

set -e

source "$(dirname "$0")/../.env"

BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"

echo "Please create the Gitea admin account manually via the web UI using the credentials in .env."
echo "After creating the account, generate an admin API token in Gitea and fill GITEA_ADMIN_TOKEN in .env."
echo "Then rerun this script to create the organization automatically."
curl -X POST "$BACKEND_URL/api/setup-gitea"
