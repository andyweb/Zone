#!/usr/bin/env bash
# Smoke test end-to-end via curl contro l'API in esecuzione.
# Uso: BASE_URL=http://localhost:8000 ./scripts/smoke_test.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
EMAIL="smoke_$(date +%s)@example.com"
PASS="password123"
# Milano, Duomo
LAT="45.4642"
LON="9.1900"

echo "== health =="
curl -fsS "$BASE_URL/health"; echo

echo "== register =="
curl -fsS -X POST "$BASE_URL/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"; echo

echo "== login =="
TOKEN=$(curl -fsS -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
echo "token ottenuto: ${TOKEN:0:20}..."

echo "== categorie =="
curl -fsS "$BASE_URL/categories"; echo

echo "== crea report =="
REPORT=$(curl -fsS -X POST "$BASE_URL/reports" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"category\":\"esempio_a\",\"note\":\"test\",\"lat\":$LAT,\"lon\":$LON}")
echo "$REPORT"
RID=$(echo "$REPORT" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

echo "== nearby =="
curl -fsS "$BASE_URL/reports/nearby?lat=$LAT&lon=$LON&radius_m=1000" \
  -H "Authorization: Bearer $TOKEN"; echo

echo "== smoke test OK (report id=$RID) =="
