#!/usr/bin/env bash
# ===========================================================================
# One-shot deployment for the Business Platform on a fresh Ubuntu VM
# (Oracle Cloud Always Free, or any Ubuntu 20.04/22.04/24.04 VPS).
#
# Run from the repo root:   sudo bash scripts/deploy.sh
# Optional HTTPS:           sudo DOMAIN=yourdomain.com bash scripts/deploy.sh
#
# Idempotent: safe to re-run. Re-running updates code deps + restarts the app.
# ===========================================================================
set -euo pipefail

PORT="${PORT:-4000}"
DOMAIN="${DOMAIN:-}"

# Resolve repo root (this script lives in scripts/) and the user who invoked sudo.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_USER="${SUDO_USER:-$(whoami)}"

say() { printf "\n\033[1;34m==> %s\033[0m\n" "$1"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo:  sudo bash scripts/deploy.sh"; exit 1
fi

# ---------------------------------------------------------------------------
say "1/8 Installing system packages (Node 20, build tools, nginx)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg git build-essential python3 nginx
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "node $(node -v), npm $(npm -v)"

# ---------------------------------------------------------------------------
say "2/8 Opening firewall ports 80/443 (Oracle Ubuntu images block these by default)"
# Oracle's Ubuntu images ship restrictive iptables in addition to the cloud
# Security List. Insert ACCEPT rules before the default REJECT and persist them.
iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
apt-get install -y netfilter-persistent iptables-persistent >/dev/null 2>&1 || true
netfilter-persistent save >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
say "3/8 Installing app dependencies + building the frontend"
chown -R "$RUN_USER":"$RUN_USER" "$APP_DIR"
sudo -u "$RUN_USER" bash -lc "cd '$APP_DIR' && npm run install:all && npm run build"

# ---------------------------------------------------------------------------
say "4/8 Generating backend/.env with strong random secrets (if missing)"
ENV_FILE="$APP_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  ACCESS=$(openssl rand -hex 32); REFRESH=$(openssl rand -hex 32)
  ADMIN_PW=$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | head -c 14)
  cat > "$ENV_FILE" <<EOF
PORT=$PORT
NODE_ENV=production
JWT_ACCESS_SECRET=$ACCESS
JWT_REFRESH_SECRET=$REFRESH
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PW
CORS_ORIGINS=
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_MINUTES=15
EOF
  chown "$RUN_USER":"$RUN_USER" "$ENV_FILE"
  echo "Generated new admin password: $ADMIN_PW   (login user: admin)"
  echo ">>> SAVE THIS PASSWORD <<<"
else
  echo ".env already exists — keeping it."
fi

# ---------------------------------------------------------------------------
say "5/8 Seeding database (only if empty)"
sudo -u "$RUN_USER" bash -lc "cd '$APP_DIR/backend' && [ -f data/app.db ] || npm run seed"

# ---------------------------------------------------------------------------
say "6/8 Starting the app with pm2 (auto-restart on boot/crash)"
npm install -g pm2 >/dev/null 2>&1
sudo -u "$RUN_USER" bash -lc "cd '$APP_DIR/backend' && NODE_ENV=production pm2 start server.js --name business-platform --update-env || pm2 restart business-platform --update-env"
sudo -u "$RUN_USER" bash -lc "pm2 save"
env PATH="$PATH" pm2 startup systemd -u "$RUN_USER" --hp "/home/$RUN_USER" >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
say "7/8 Configuring nginx reverse proxy"
SERVER_NAME="${DOMAIN:-_}"
cat > /etc/nginx/sites-available/business-platform <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;
    client_max_body_size 12M;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/business-platform /etc/nginx/sites-enabled/business-platform
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---------------------------------------------------------------------------
say "8/8 HTTPS"
if [ -n "$DOMAIN" ]; then
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || \
    echo "certbot failed — ensure $DOMAIN points to this server's IP, then re-run with DOMAIN set."
else
  echo "No DOMAIN provided — serving over HTTP only. Re-run with DOMAIN=yourdomain.com for HTTPS."
fi

IP=$(curl -s https://api.ipify.org || echo "<server-ip>")
say "Done!"
echo "  Site:  http://${DOMAIN:-$IP}/"
echo "  Admin: http://${DOMAIN:-$IP}/admin   (user: admin)"
[ -f "$ENV_FILE" ] && grep -q ADMIN_PASSWORD "$ENV_FILE" && echo "  Admin password is in backend/.env (ADMIN_PASSWORD)."
