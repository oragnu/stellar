# Deploying to a VPS — Docker or bare-metal (no Docker)

## Option A: VPS + Docker (recommended if you're comfortable with Docker)

This is just the [Docker recipe](docker.md) run on a VPS you provision
yourself (Hetzner, DigitalOcean, Linode, etc.) — install Docker + the
Compose plugin on the box, then follow `docs/deployment/docker.md` exactly.
There is no separate VPS-specific guide needed beyond that.

## Option B: bare-metal, no Docker

For self-hosters who'd rather not run Docker at all. This runs Stellar as a
systemd service behind Caddy, with Postgres installed via your distro's
package manager.

### 1. Install system dependencies (Debian/Ubuntu example)

```bash
sudo apt update
sudo apt install -y python3.12 python3.12-venv postgresql postgresql-contrib \
  nodejs npm caddy
curl -LsSf https://astral.sh/uv/install.sh | sh   # installs uv
```

### 2. Create the Postgres database

```bash
sudo -u postgres createuser stellar --pwprompt
sudo -u postgres createdb stellar --owner=stellar
```

### 3. Clone and build

```bash
git clone https://github.com/oragnu/stellar.git /opt/stellar
cd /opt/stellar

# Backend
cd backend
uv sync --no-dev
cp ../.env.example ../.env   # fill in DATABASE_URL, GitHub OAuth creds, secrets — see docker.md §2
uv run alembic upgrade head

# Frontend (build once; output gets served as static files by the backend)
cd ../frontend
npm ci
npm run build   # outputs to frontend/dist — copy or symlink into where app.main expects static files
```

### 4. systemd unit

`/etc/systemd/system/stellar.service`:

```ini
[Unit]
Description=Stellar
After=network.target postgresql.service

[Service]
Type=simple
User=stellar
WorkingDirectory=/opt/stellar/backend
EnvironmentFile=/opt/stellar/.env
ExecStart=/opt/stellar/backend/.venv/bin/gunicorn app.main:app \
  -k uvicorn.workers.UvicornWorker --workers 1 --bind 127.0.0.1:8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd --system --home /opt/stellar stellar
sudo chown -R stellar:stellar /opt/stellar
sudo systemctl daemon-reload
sudo systemctl enable --now stellar
```

Keep `--workers 1` — APScheduler's background jobs run in-process and assume
a single worker (see `docs/adr/0003-apscheduler-no-redis-by-default.md`).

### 5. Caddy reverse proxy + TLS

`/etc/caddy/Caddyfile`:

```caddyfile
stellar.example.com {
    reverse_proxy 127.0.0.1:8000
}
```

```bash
sudo systemctl reload caddy
```

### 6. Updates

```bash
cd /opt/stellar
git pull
cd backend && uv sync --no-dev && uv run alembic upgrade head
cd ../frontend && npm ci && npm run build
sudo systemctl restart stellar
```
