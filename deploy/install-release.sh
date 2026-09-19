#!/usr/bin/env bash

set -euo pipefail

if [[ "$EUID" -ne 0 ]]; then
    echo "Run this installer as root." >&2
    exit 1
fi

if [[ $# -ne 2 ]]; then
    echo "Usage: $0 <release.tar.gz> <release.tar.gz.sha256>" >&2
    exit 1
fi

ARCHIVE="$(readlink -f "$1")"
CHECKSUM="$(readlink -f "$2")"

[[ -f "$ARCHIVE" ]] || { echo "Archive not found: $ARCHIVE" >&2; exit 1; }
[[ -f "$CHECKSUM" ]] || { echo "Checksum not found: $CHECKSUM" >&2; exit 1; }

cd "$(dirname "$ARCHIVE")"
sha256sum --check "$(basename "$CHECKSUM")"

RELEASE_NAME="$(basename "$ARCHIVE" .tar.gz)"
RELEASE_DIR="/opt/amin-crm/releases/$RELEASE_NAME"

if [[ -e "$RELEASE_DIR" ]]; then
    echo "Release already exists: $RELEASE_DIR" >&2
    exit 1
fi

if ! id amin-crm >/dev/null 2>&1; then
    useradd --system --home-dir /var/lib/amin-crm --shell /usr/sbin/nologin amin-crm
fi

install -d -o root -g amin-crm -m 0750 /opt/amin-crm/releases
install -d -o amin-crm -g amin-crm -m 0750 /var/lib/amin-crm
install -d -o root -g amin-crm -m 0750 /var/backups/amin-crm
mkdir -p "$RELEASE_DIR"
tar -C "$RELEASE_DIR" -xzf "$ARCHIVE"
chown -R root:amin-crm "$RELEASE_DIR"
chmod -R u=rwX,g=rX,o= "$RELEASE_DIR"

ln -sfn "$RELEASE_DIR" /opt/amin-crm/current

if [[ ! -f /etc/amin-crm.env ]]; then
    install -o root -g amin-crm -m 0640 \
        "$RELEASE_DIR/deployment/amin-crm.env.example" \
        /etc/amin-crm.env
    echo "Created /etc/amin-crm.env. Review it before starting the service."
fi

install -o root -g root -m 0644 \
    "$RELEASE_DIR/deployment/systemd/amin-crm-migrate.service" \
    "$RELEASE_DIR/deployment/systemd/amin-crm.service" \
    "$RELEASE_DIR/deployment/systemd/amin-crm-reminder.service" \
    /etc/systemd/system/

systemctl daemon-reload

echo "Installed release: $RELEASE_DIR"
echo "Next steps:"
echo "  1. Review /etc/amin-crm.env"
echo "  2. Install deployment/Caddyfile as /etc/caddy/Caddyfile and validate it"
echo "  3. Run: systemctl enable --now amin-crm.service"
echo "  4. Run the health check: curl --fail http://127.0.0.1:3005/api/health"
