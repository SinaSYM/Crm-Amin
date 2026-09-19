#!/usr/bin/env bash

set -Eeuo pipefail

DOMAIN="${CRM_DOMAIN:-crm.aitechsite.site}"
APP_PORT="${CRM_PORT:-3005}"
ENV_FILE="/etc/amin-crm.env"
APP_ROOT="/opt/amin-crm/current"
TEMP_DIR=""

log() {
    printf '\n\033[1;34m==> %s\033[0m\n' "$1"
}

warn() {
    printf '\033[1;33mWARNING: %s\033[0m\n' "$1" >&2
}

fail() {
    printf '\033[1;31mERROR: %s\033[0m\n' "$1" >&2
    exit 1
}

cleanup() {
    if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}

on_error() {
    local exit_code=$?
    warn "Server setup stopped with exit code $exit_code."
    if command -v systemctl >/dev/null 2>&1; then
        systemctl --no-pager --full status amin-crm.service 2>/dev/null || true
        journalctl -u amin-crm.service -n 40 --no-pager 2>/dev/null || true
    fi
    exit "$exit_code"
}

trap cleanup EXIT
trap on_error ERR

if [[ "$EUID" -ne 0 ]]; then
    fail "Run this script as root: sudo bash server-setup.sh <archive> <checksum>"
fi

if [[ $# -ne 2 ]]; then
    fail "Usage: $0 <amin-crm-release.tar.gz> <amin-crm-release.tar.gz.sha256>"
fi

ARCHIVE="$(readlink -f "$1")"
CHECKSUM="$(readlink -f "$2")"

[[ -f "$ARCHIVE" ]] || fail "Release archive not found: $ARCHIVE"
[[ -f "$CHECKSUM" ]] || fail "Checksum file not found: $CHECKSUM"
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]] || fail "Invalid CRM_DOMAIN: $DOMAIN"
[[ "$APP_PORT" =~ ^[0-9]+$ ]] || fail "CRM_PORT must be numeric."

if [[ "$(uname -m)" != "x86_64" ]]; then
    fail "This release was built for x86_64. Server architecture is $(uname -m)."
fi

if [[ ! -r /etc/os-release ]]; then
    fail "/etc/os-release is missing; only Debian/Ubuntu servers are supported."
fi

# shellcheck disable=SC1091
source /etc/os-release
case "${ID:-}:${ID_LIKE:-}" in
    debian:*|ubuntu:*|*:debian*|*:ubuntu*) ;;
    *) fail "Unsupported operating system: ${PRETTY_NAME:-unknown}. Use Debian or Ubuntu." ;;
esac

install_node() {
    if [[ -x /usr/bin/node ]] && /usr/bin/node -e '
        const [major, minor] = process.versions.node.split(".").map(Number)
        process.exit(major > 20 || (major === 20 && minor >= 9) ? 0 : 1)
    '; then
        return
    fi

    log "Installing Node.js 22 LTS"
    install -d -m 0755 /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
    printf '%s\n' \
        'deb [arch=amd64 signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main' \
        > /etc/apt/sources.list.d/nodesource.list
    apt-get update
    apt-get install -y nodejs
}

install_caddy() {
    if command -v caddy >/dev/null 2>&1 \
        && systemctl cat caddy.service >/dev/null 2>&1; then
        return
    fi

    log "Installing Caddy"
    if apt-get install -y caddy; then
        return
    fi

    install -d -m 0755 /usr/share/keyrings
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
        | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
        > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update
    apt-get install -y caddy
}

log "Installing base server packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg gzip tar sqlite3
install_node
install_caddy

log "Validating server runtime"
node --version
caddy version
(
    cd "$(dirname "$ARCHIVE")"
    sha256sum --check "$(basename "$CHECKSUM")"
)

DOMAIN_IPV4="$(getent ahostsv4 "$DOMAIN" | awk 'NR == 1 { print $1 }' || true)"
SERVER_IPV4="$(curl -4fsS --max-time 10 https://api.ipify.org || true)"
if [[ -n "$DOMAIN_IPV4" && -n "$SERVER_IPV4" && "$DOMAIN_IPV4" != "$SERVER_IPV4" ]]; then
    warn "$DOMAIN resolves to $DOMAIN_IPV4 but this server reports $SERVER_IPV4. HTTPS issuance may fail."
elif [[ -n "$DOMAIN_IPV4" ]]; then
    log "DNS check passed: $DOMAIN -> $DOMAIN_IPV4"
else
    warn "No IPv4 DNS record was found for $DOMAIN."
fi

ENV_EXISTED=0
[[ -f "$ENV_FILE" ]] && ENV_EXISTED=1

log "Installing versioned CRM release"
TEMP_DIR="$(mktemp -d)"
tar -C "$TEMP_DIR" -xzf "$ARCHIVE" ./deployment/install-release.sh
bash "$TEMP_DIR/deployment/install-release.sh" "$ARCHIVE" "$CHECKSUM"

if [[ "$ENV_EXISTED" -eq 0 ]]; then
    if [[ -z "${ADMIN_EMAIL:-}" ]]; then
        read -r -p "Initial admin email: " ADMIN_EMAIL
    fi
    if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
        read -r -s -p "Initial admin password (12+ safe characters): " ADMIN_PASSWORD
        printf '\n'
    fi

    [[ "$ADMIN_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] \
        || fail "ADMIN_EMAIL is invalid."
    [[ ${#ADMIN_PASSWORD} -ge 12 ]] || fail "ADMIN_PASSWORD must contain at least 12 characters."
    [[ "$ADMIN_PASSWORD" =~ ^[A-Za-z0-9._@%+=:,/-]+$ ]] \
        || fail "ADMIN_PASSWORD contains unsupported shell characters. Use letters, numbers, or ._@%+=:,/-"

    log "Creating protected production environment file"
    cat > "$ENV_FILE" <<EOF
NODE_ENV=production
HOSTNAME=127.0.0.1
PORT=$APP_PORT
DATABASE_URL=file:/var/lib/amin-crm/custom.db
DEMO_AUTH=0
GEMINI_API_KEY=
REMINDER_WEBHOOK_URL=
REMINDER_WEBHOOK_METHOD=POST
REMINDER_WEBHOOK_HEADERS='{"Content-Type":"application/json"}'
REMINDER_WEBHOOK_PAYLOAD_TEMPLATE='{"recipient_phone":"{recipient_phone}","title":"{title}","due_date":"{due_date}","description":"{description}"}'
REMINDER_POLL_INTERVAL_MS=60000
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF
    chown root:amin-crm "$ENV_FILE"
    chmod 0640 "$ENV_FILE"
else
    log "Keeping existing $ENV_FILE"
    warn "Existing environment was not overwritten. Confirm HOSTNAME=127.0.0.1, PORT=$APP_PORT and DEMO_AUTH=0."
fi

log "Starting migrations and CRM service"
systemctl daemon-reload
systemctl enable --now amin-crm.service

HEALTH_OK=0
for _ in {1..30}; do
    if curl -fsS --max-time 3 "http://127.0.0.1:$APP_PORT/api/health" >/dev/null; then
        HEALTH_OK=1
        break
    fi
    sleep 1
done
[[ "$HEALTH_OK" -eq 1 ]] || fail "CRM did not become healthy on 127.0.0.1:$APP_PORT."

if grep -q '^ADMIN_EMAIL=' "$ENV_FILE" && grep -q '^ADMIN_PASSWORD=' "$ENV_FILE"; then
    log "Bootstrapping production administrator"
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    runuser -u amin-crm -- env \
        DATABASE_URL="$DATABASE_URL" \
        ADMIN_EMAIL="$ADMIN_EMAIL" \
        ADMIN_PASSWORD="$ADMIN_PASSWORD" \
        node "$APP_ROOT/ops/bootstrap-admin.mjs"
    sed -i '/^ADMIN_EMAIL=/d; /^ADMIN_PASSWORD=/d' "$ENV_FILE"
    unset ADMIN_EMAIL ADMIN_PASSWORD
fi

log "Installing Caddy configuration for $DOMAIN"
CADDY_TEMP="$TEMP_DIR/Caddyfile"
cat > "$CADDY_TEMP" <<EOF
$DOMAIN {
    encode zstd gzip
    reverse_proxy 127.0.0.1:$APP_PORT
}
EOF
caddy validate --config "$CADDY_TEMP" --adapter caddyfile
if [[ -f /etc/caddy/Caddyfile ]]; then
    cp -a /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.backup-$(date -u +%Y%m%dT%H%M%SZ)"
fi
install -o root -g root -m 0644 "$CADDY_TEMP" /etc/caddy/Caddyfile
systemctl enable caddy
systemctl restart caddy

PUBLIC_OK=0
for _ in {1..15}; do
    if curl -fsS --max-time 5 "https://$DOMAIN/api/health" >/dev/null; then
        PUBLIC_OK=1
        break
    fi
    sleep 2
done

log "Deployment result"
curl -fsS "http://127.0.0.1:$APP_PORT/api/health"
printf '\n'
systemctl --no-pager --full status amin-crm.service | sed -n '1,12p'
systemctl --no-pager --full status caddy | sed -n '1,12p'

if [[ "$PUBLIC_OK" -eq 1 ]]; then
    printf '\nCRM is available at: https://%s\n' "$DOMAIN"
else
    warn "The local service is healthy, but public HTTPS is not ready yet. Verify DNS and that ports 80/443 are open."
fi

printf '%s\n' \
    "Keep port $APP_PORT private." \
    "Enable amin-crm-reminder.service only after configuring REMINDER_WEBHOOK_URL." \
    "Create the first backup with: sudo $APP_ROOT/ops/backup-db.sh"
