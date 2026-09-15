#!/bin/bash
set -e

echo "🚀 Starting test environment..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Start Docker services
echo "📦 Starting Docker containers..."
docker compose -f "$BACKEND_DIR/docker-compose.test.yml" up -d

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
until docker compose -f "$BACKEND_DIR/docker-compose.test.yml" exec -T postgres-test pg_isready -U bookstrata > /dev/null 2>&1; do
  sleep 1
done
echo "✅ PostgreSQL ready"

# Wait for Redis
echo "⏳ Waiting for Redis..."
until docker compose -f "$BACKEND_DIR/docker-compose.test.yml" exec -T redis-test redis-cli ping > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Redis ready"

# Setup backend
echo "📦 Setting up backend..."
cd "$BACKEND_DIR"

# Copy test env
cp .env.test .env

# Run migrations
echo "🔄 Running migrations..."
npx prisma migrate deploy --schema=prisma/schema.prisma

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "✅ Test environment ready!"
echo ""
echo "To start the servers:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: npm run dev"
echo ""
echo "To run tests:"
echo "  npm run test:e2e"
