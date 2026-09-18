#!/usr/bin/env bash
# Ensure the local PostgreSQL cluster is running and accepting connections.
# Idempotent and cheap: safe to call from both `start` and the dev-server
# terminal so the app is never pointed at a down database.
set -euo pipefail

PG_VER="$(pg_lsclusters -h | awk 'NR==1{print $1}')"
PG_CLUSTER="$(pg_lsclusters -h | awk 'NR==1{print $2}')"

# `start` also clears a stale PID file left behind by a snapshot boot.
sudo pg_ctlcluster "$PG_VER" "$PG_CLUSTER" start 2>/dev/null || true

for _ in $(seq 1 30); do
  pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && break
  sleep 1
done
pg_isready -h 127.0.0.1 -p 5432
