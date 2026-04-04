#!/usr/bin/env bash
set -euo pipefail

SERVER_RUNTIME_ROOT="/srv/financial-bot-runtime"
MAC_RUNTIME_ROOT="/Users/yechankun/Runtime/financial-bot-worker"
MAC_HOST="macbook"

# 1. completed report job result metadata
rsync -az \
  "${MAC_HOST}:${MAC_RUNTIME_ROOT}/runs/report-jobs/processed/" \
  "${SERVER_RUNTIME_ROOT}/runs/report-jobs/processed/"

# 2. report run artifacts
rsync -az \
  "${MAC_HOST}:${MAC_RUNTIME_ROOT}/runs/" \
  "${SERVER_RUNTIME_ROOT}/runs/" \
  --include='*/' \
  --include='*.json' \
  --include='*.md' \
  --include='*.html' \
  --include='*.png' \
  --exclude='*'

# 3. market db replica back to ingress server
rsync -az \
  "${MAC_HOST}:${MAC_RUNTIME_ROOT}/data/etf_constituent_aggregates.sqlite3" \
  "${SERVER_RUNTIME_ROOT}/data/etf_constituent_aggregates.sqlite3"

# 4. benchmark replica if ingress needs read-only benchmark views
rsync -az \
  "${MAC_HOST}:${MAC_RUNTIME_ROOT}/benchmark/" \
  "${SERVER_RUNTIME_ROOT}/benchmark/"
