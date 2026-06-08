#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# BookStrata — получение SSL-сертификата (Let's Encrypt)
# ============================================================
# Запускать на сервере ДО того как nginx начнёт слушать 443-й порт.
#
# Использование:
#   sudo ./scripts/setup-ssl.sh bookstrata.ru
# ============================================================

if [ $# -lt 1 ]; then
  echo "Usage: $0 <domain> [www-domain]"
  echo "Example: $0 bookstrata.ru www.bookstrata.ru"
  exit 1
fi

DOMAIN="$1"
WWW_DOMAIN="${2:-www.$DOMAIN}"

echo "==> Установка certbot..."
if ! command -v certbot &>/dev/null; then
  sudo apt update && sudo apt install -y certbot python3-certbot-nginx
fi

echo "==> Получение сертификата для $DOMAIN и $WWW_DOMAIN..."
sudo certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email fedorpasyada@yandex.ru \
  --domains "$DOMAIN" \
  --domains "$WWW_DOMAIN" \
  --redirect

echo "==> Проверка автообновления (раз в 2 месяца)..."
sudo certbot renew --dry-run

echo ""
echo "✅ Готово! Сертификаты в /etc/letsencrypt/live/$DOMAIN/"
echo "   Автообновление настроено через systemd timer."
