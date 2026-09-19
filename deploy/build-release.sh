#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

command -v node >/dev/null || {
    echo "Node.js is required to build the release." >&2
    exit 1
}
command -v tar >/dev/null || {
    echo "tar is required to package the release." >&2
    exit 1
}
command -v sha256sum >/dev/null || {
    echo "sha256sum is required to sign the release manifest." >&2
    exit 1
}

if command -v bun >/dev/null; then
    echo "Installing frozen dependencies with Bun..."
    bun install --frozen-lockfile
    bun run verify
    DATABASE_URL="${DATABASE_URL:-file:/tmp/amin-crm-build.db}" bun run build
else
    echo "Bun is unavailable; using the synchronized npm lockfile..."
    npm ci
    npm run verify
    DATABASE_URL="${DATABASE_URL:-file:/tmp/amin-crm-build.db}" npm run build
fi

echo "Preparing the pinned Prisma migration CLI..."
npm ci --omit=dev --prefix deploy/prisma-cli

node --check .next/standalone/workers/reminder-worker.js

RELEASE_ID="${RELEASE_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
GIT_REVISION="$(git rev-parse --short HEAD 2>/dev/null || echo no-git)"
if [[ -n "$(git status --porcelain 2>/dev/null || true)" ]]; then
    GIT_REVISION="$GIT_REVISION-dirty"
fi
DIST_DIR="$PROJECT_ROOT/dist"
STAGING_DIR="$DIST_DIR/.staging-$RELEASE_ID"
ARCHIVE="$DIST_DIR/amin-crm-$RELEASE_ID-$GIT_REVISION.tar.gz"

cleanup() {
    rm -rf "$STAGING_DIR"
}
trap cleanup EXIT

mkdir -p "$DIST_DIR"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

cp -a .next/standalone/. "$STAGING_DIR/"
mkdir -p "$STAGING_DIR/ops/prisma-cli" "$STAGING_DIR/deployment/systemd"
cp -a deploy/prisma-cli/package.json deploy/prisma-cli/package-lock.json "$STAGING_DIR/ops/prisma-cli/"
cp -a deploy/prisma-cli/node_modules "$STAGING_DIR/ops/prisma-cli/"
cp deploy/bootstrap-admin.mjs deploy/backup-db.sh deploy/sqlite-backup.mjs "$STAGING_DIR/ops/"
cp deploy/systemd/*.service "$STAGING_DIR/deployment/systemd/"
cp deploy/amin-crm.env.example deploy/install-release.sh deploy/server-setup.sh deploy/README.md Caddyfile "$STAGING_DIR/deployment/"

cat > "$STAGING_DIR/RELEASE_INFO" <<EOF
release_id=$RELEASE_ID
git_revision=$GIT_REVISION
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
builder_os=$(uname -s)
builder_arch=$(uname -m)
node_version=$(node --version)
EOF

tar -C "$STAGING_DIR" -czf "$ARCHIVE" .
(
    cd "$DIST_DIR"
    sha256sum "$(basename "$ARCHIVE")" > "$(basename "$ARCHIVE").sha256"
)

echo "Release archive: $ARCHIVE"
echo "Checksum:        $ARCHIVE.sha256"
