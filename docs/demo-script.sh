#!/usr/bin/env bash
# docs/demo-script.sh — end-to-end demo of cost, category, sales, and profit.
# Prerequisites: backend running on :4000 (standalone mock is fine).
# Usage: bash docs/demo-script.sh

set -euo pipefail

BASE="${BASE_URL:-http://localhost:4000}"

echo "== Health =="
curl -sS "$BASE/api/health"
echo

echo "== Login =="
LOGIN=$(curl -sS -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"owner","password":"owner1234"}')
echo "$LOGIN"
TOKEN=$(echo "$LOGIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
if [ -z "$TOKEN" ]; then
  echo "Login failed — is the backend running?"
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"

echo
echo "== Categories =="
curl -sS "$BASE/api/categories" -H "$AUTH"
echo

echo
echo "== Products (note category + cost_price) =="
curl -sS "$BASE/api/products" -H "$AUTH"
echo

echo
echo "== Record a sale (stamps unit_cost from product cost_price) =="
SALE=$(curl -sS -X POST "$BASE/api/sales" \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":1,"quantity":2}]}')
echo "$SALE"
echo

echo "== Profit report (monthly) =="
curl -sS "$BASE/api/reports/profit?period=monthly" -H "$AUTH"
echo

echo
echo "== Profit report (daily) =="
curl -sS "$BASE/api/reports/profit?period=daily" -H "$AUTH"
echo

echo
echo "Demo complete. UI walkthrough:"
echo "  1. Log in as owner / owner1234"
echo "  2. Inventory — edit a product; cost & category persist via API"
echo "  3. Categories — CRUD against /api/categories"
echo "  4. New sale → Confirm → Success (AppShell + unit_cost stamped)"
echo "  5. Profit — Daily/Weekly/Monthly/Yearly from /api/reports/profit"
