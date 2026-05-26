#!/bin/bash
VERSION=$(git rev-parse --abbrev-ref HEAD)-$(git rev-parse --short HEAD)
sed -i "s|SERVER_VERSION=.*|SERVER_VERSION=${VERSION}|" .env.dev
sed -i "s|server_version: \".*\"|server_version: \"${VERSION}\"|" ./vidjil-client/conf/conf.js
echo "Version mise à jour : $VERSION"
docker compose up -d