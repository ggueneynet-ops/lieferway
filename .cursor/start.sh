#!/usr/bin/env bash
# Per-boot runtime init: bring PostgreSQL online and make sure the schema and
# demo data are present. All steps are idempotent and safe to re-run.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Start the PostgreSQL cluster (no-op if it is already running).
PG_VER="$(pg_lsclusters -h | awk 'NR==1{print $1}')"
PG_CLUSTER="$(pg_lsclusters -h | awk 'NR==1{print $2}')"
sudo pg_ctlcluster "$PG_VER" "$PG_CLUSTER" start 2>/dev/null || true

for _ in $(seq 1 30); do
  pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && break
  sleep 1
done
pg_isready -h 127.0.0.1 -p 5432

# Reconcile schema and seed data (both no-ops on an already-prepared database).
npm run db:migrate
npx tsx scripts/seed-if-empty.ts
