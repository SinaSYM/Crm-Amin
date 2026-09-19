# Amin CRM production deployment

This directory contains the production release tooling. Application builds run
on the workstation; the server only extracts and runs the standalone artifact.

## Server requirements

- Linux `x86_64` compatible with the builder's glibc/OpenSSL, or a build made
  specifically for the server platform
- Node.js 22 LTS installed as `/usr/bin/node`
- Caddy
- SQLite CLI (recommended; Node.js 22's SQLite backup API is used as fallback)
- `systemd`, `tar`, `gzip`, and `sha256sum`

## 1. Build locally

```bash
npm run build:release
```

The command uses Bun with a frozen lockfile when Bun is available, otherwise it
uses the synchronized npm lockfile. It runs Prisma generation, lint, typecheck,
production build, worker syntax validation, and packages a pinned Prisma
migration runner.

The generated files are written to `dist/`:

```text
amin-crm-<release-id>-<git-revision>.tar.gz
amin-crm-<release-id>-<git-revision>.tar.gz.sha256
```

The release never contains `.env` or a production SQLite database.

## 2. Upload and install

For a new Debian/Ubuntu server, upload the archive, checksum, and
`deploy/server-setup.sh`, then run the one-shot setup:

```bash
sudo bash server-setup.sh \
  amin-crm-<release>.tar.gz \
  amin-crm-<release>.tar.gz.sha256
```

The script installs Node.js/Caddy when needed, checks the server architecture
and DNS, installs the versioned release, prompts for the first administrator,
runs migrations, starts systemd services, configures `crm.aitechsite.site`, and
tests both local health and public HTTPS.

For a server that has already been provisioned, use the lower-level installer:

```bash
sudo bash install-release.sh \
  amin-crm-<release>.tar.gz \
  amin-crm-<release>.tar.gz.sha256
```

The installer creates a versioned directory under `/opt/amin-crm/releases` and
atomically switches `/opt/amin-crm/current`. It does not automatically start the
application or overwrite Caddy configuration.

## 3. Configure the environment

Review `/etc/amin-crm.env` and keep it owned by `root:amin-crm` with mode `0640`.
The production database must remain outside all release directories:

```env
DATABASE_URL=file:/var/lib/amin-crm/custom.db
HOSTNAME=127.0.0.1
PORT=3005
DEMO_AUTH=0
```

## 4. Start and migrate

```bash
sudo systemctl enable --now amin-crm.service
sudo systemctl status amin-crm.service
curl --fail http://127.0.0.1:3005/api/health
```

`amin-crm.service` requires the oneshot migration unit. Pending Prisma
migrations are applied before the application starts, and a migration failure
prevents the new application version from starting.

## 5. Bootstrap the first administrator

Temporarily add `ADMIN_EMAIL` and a random `ADMIN_PASSWORD` of at least 12
characters to `/etc/amin-crm.env`, then run:

```bash
sudo -u amin-crm bash -c '
  set -a
  source /etc/amin-crm.env
  set +a
  node /opt/amin-crm/current/ops/bootstrap-admin.mjs
'
```

Remove both bootstrap variables immediately after the command succeeds.

## 6. Configure Caddy

Review the packaged `deployment/Caddyfile`, install it, validate, and reload:

```bash
sudo install -o root -g root -m 0644 \
  /opt/amin-crm/current/deployment/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
```

Only ports 80 and 443 should be public. Port 3005 must remain bound to
`127.0.0.1` and blocked from the internet.

## 7. Back up SQLite

Create an online, consistent backup before every migration and on a schedule:

```bash
sudo ENV_FILE=/etc/amin-crm.env \
  /opt/amin-crm/current/ops/backup-db.sh
```

Backups are written to `/var/backups/amin-crm` with SHA-256 checksums. Copy them
to storage outside the server and periodically test restore procedures.

## 8. Optional reminder worker

The reminder service is not enabled by the installer. Configure and test a real
`REMINDER_WEBHOOK_URL` first, then enable it:

```bash
sudo systemctl enable --now amin-crm-reminder.service
```

Failed webhook deliveries remain pending and are retried on the next polling
cycle. Monitor logs to prevent repeated failures from growing the activity log.

## 9. Rollback

Code rollback is atomic:

```bash
sudo ln -sfn /opt/amin-crm/releases/<previous-release> /opt/amin-crm/current
sudo systemctl restart amin-crm.service
```

Database schema rollback is not automatic. Restore a verified backup only when
the migration itself is incompatible with the previous release.

## Validation commands

```bash
systemctl status amin-crm.service
journalctl -u amin-crm.service -n 100 --no-pager
curl --fail http://127.0.0.1:3005/api/health
curl --fail https://crm.aitechsite.site/api/health
```
