#!/usr/bin/env bash
# Idempotent repository bootstrap for the Lieferway Cloud Agent environment.
# Installs PostgreSQL (once), provisions the local database, installs Node
# dependencies, and applies Prisma migrations + demo seed data.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# 1. System dependency: PostgreSQL (only install if absent).
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-client
fi

# 2. Start the default cluster (created automatically by the apt package).
PG_VER="$(pg_lsclusters -h | awk 'NR==1{print $1}')"
PG_CLUSTER="$(pg_lsclusters -h | awk 'NR==1{print $2}')"
sudo pg_ctlcluster "$PG_VER" "$PG_CLUSTER" start 2>/dev/null || true

for _ in $(seq 1 30); do
  pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && break
  sleep 1
done
pg_isready -h 127.0.0.1 -p 5432

# 3. Provision the lieferway role and database (matches docker-compose defaults).
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='lieferway'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE lieferway LOGIN PASSWORD 'lieferway';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='lieferway'" | grep -q 1 \
  || sudo -u postgres createdb -O lieferway lieferway

# 4. Local .env (created once; secrets stay out of git). AUTH_SECRET must be
#    stable across boots so existing sessions keep working.
if [ ! -f .env ]; then
  cat > .env <<EOF
DATABASE_URL="postgresql://lieferway:lieferway@127.0.0.1:5432/lieferway"
AUTH_SECRET="$(openssl rand -base64 32)"
NEXT_PUBLIC_APP_URL="http://127.0.0.1:43123"
EXPO_PUBLIC_API_URL="http://127.0.0.1:43123"
EOF
fi

# 5. Web app dependencies (postinstall runs `prisma generate`).
npm ci

# 6. Prisma: apply migrations and seed demo data only when the DB is empty.
npm run db:migrate
npx tsx scripts/seed-if-empty.ts

# 7. Expo customer app dependencies.
if [ -f mobile/package-lock.json ]; then
  ( cd mobile && npm ci )
fi
