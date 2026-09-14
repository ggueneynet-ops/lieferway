#!/usr/bin/env bash
# Per-boot runtime init: bring PostgreSQL online and make sure the schema and
# demo data are present. All steps are idempotent and safe to re-run.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Start the PostgreSQL cluster (no-op if already running; clears stale PID).
bash "$REPO_ROOT/.cursor/ensure-db.sh"

# Reconcile schema and seed data (both no-ops on an already-prepared database).
npm run db:migrate
npx tsx scripts/seed-if-empty.ts
