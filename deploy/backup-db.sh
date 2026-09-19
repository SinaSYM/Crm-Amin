#!/usr/bin/env bash

set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/amin-crm.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/amin-crm}"

if [[ -r "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
elif [[ -z "${DATABASE_URL:-}" ]]; then
    echo "Environment file is not readable and DATABASE_URL is unset: $ENV_FILE" >&2
    exit 1
fi

if [[ "${DATABASE_URL:-}" != file:* ]]; then
    echo "DATABASE_URL must be a file: SQLite URL." >&2
    exit 1
fi

DB_PATH="${DATABASE_URL#file:}"
if [[ ! -f "$DB_PATH" ]]; then
    echo "Database file does not exist: $DB_PATH" >&2
    exit 1
fi

install -d -m 0750 "$BACKUP_DIR"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SNAPSHOT="$BACKUP_DIR/custom-$TIMESTAMP.db"

if command -v sqlite3 >/dev/null; then
    sqlite3 "$DB_PATH" ".backup '$SNAPSHOT'"
else
    node "$(dirname "${BASH_SOURCE[0]}")/sqlite-backup.mjs" "$DB_PATH" "$SNAPSHOT"
fi
gzip -9 "$SNAPSHOT"
sha256sum "$SNAPSHOT.gz" > "$SNAPSHOT.gz.sha256"

echo "Backup created: $SNAPSHOT.gz"
