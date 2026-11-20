#!/bin/sh
# Updates a deployment: pulls the latest code and builds the image while the old container keeps running, then
# stops it and starts the new one, so the downtime is only the restart.
# Usage, from anywhere: ./scripts/update.sh
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "Missing .env (copy .env.example and fill it in)" >&2
    exit 1
fi

library_path=$(sed -n 's/^MEDIA_LIBRARY_HOST_PATH=//p' .env)
if [ ! -d "$library_path" ]; then
    echo "MEDIA_LIBRARY_HOST_PATH ($library_path) is not a folder: is the drive mounted?" >&2
    exit 1
fi

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Building images"
docker compose build

echo "==> Stopping containers"
docker compose down

echo "==> Starting containers"
docker compose up -d --wait

docker compose ps
