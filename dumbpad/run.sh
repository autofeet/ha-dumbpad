#!/bin/sh
set -eu
mkdir -p /app/data
chown -R node:node /app/data
exec su-exec node:node docker-entrypoint.sh "$@"
