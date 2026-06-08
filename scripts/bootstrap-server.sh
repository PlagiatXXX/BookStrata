#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# BookStrata — первичная настройка сервера
# ============================================================
# Запускать один раз после покупки VPS.
# Использование:
#   scp scripts/bootstrap-server.sh root@<ip>:/tmp/
#   ssh root@<ip> bash /tmp/bootstrap-server.sh
# ============================================================

echo "==> 1. Системные зависимости..."
apt update && apt upgrade -y
apt install -y \
  git curl wget htop \
  docker.io docker-compose-plugin \
  nginx certbot python3-certbot-nginx \
  postgresql-client redis-tools \
  cron

echo "==> 2. Node.js 20 LTS..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

echo "==> 3. PM2 (глобально)..."
npm install -g pm2
pm2 startup systemd -u root --hp /root

echo "==> 4. Директории..."
mkdir -p /var/log/bookstrata
mkdir -p /var/www/bookstrata
mkdir -p /etc/nginx/ssl

echo "==> 5. Cron — ежедневный бэкап БД в 3:00..."
cat > /etc/cron.d/bookstrata-backup << 'EOF'
0 3 * * * root /root/bookstrata/scripts/backup-db.sh >> /var/log/bookstrata/backup.log 2>&1
EOF
chmod 644 /etc/cron.d/bookstrata-backup

echo "==> 6. Логи — ротация..."
cat > /etc/logrotate.d/bookstrata << 'EOF'
/var/log/bookstrata/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF

echo ""
echo "✅ Сервер готов к деплою BookStrata."
echo ""
echo "Дальше:"
echo "  git clone <repo> /root/bookstrata"
echo "  cd /root/bookstrata"
echo "  cp backend/.env.production.example backend/.env  # заполнить"
echo "  cp .env.production.example .env.production       # заполнить"
echo "  npm run build                                     # собрать фронт"
echo "  cd backend && docker build -t bookstrata-backend ."
echo "  pm2 start ecosystem.config.cjs                    # запустить API"
echo "  ./scripts/setup-ssl.sh bookstrata.ru              # SSL"
echo "  systemctl reload nginx                            # применить nginx"
