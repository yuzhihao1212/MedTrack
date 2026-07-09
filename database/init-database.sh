#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load_env_file() {
  local env_file="$1"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

load_env_file "$ROOT_DIR/.env"
load_env_file "$ROOT_DIR/backend/.env"

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_DATABASE="${MYSQL_DATABASE:-medtrack}"
export MYSQL_PWD="${MYSQL_PASSWORD:-${MYSQL_PWD:-}}"

MYSQL_ARGS=(--protocol=tcp -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER")

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[init-db] Missing required command: $1" >&2
    exit 1
  fi
}

run_sql_file() {
  local label="$1"
  local database_name="$2"
  local sql_file="$3"

  echo "[init-db] Running $label"
  if [[ -n "$database_name" ]]; then
    mysql "${MYSQL_ARGS[@]}" "$database_name" < "$sql_file"
  else
    mysql "${MYSQL_ARGS[@]}" < "$sql_file"
  fi
}

require_command mysql
require_command node

echo "[init-db] Initialising MySQL database '$MYSQL_DATABASE' on $MYSQL_HOST:$MYSQL_PORT"

run_sql_file "schema" "" "$ROOT_DIR/database/sql/schema.sql"
run_sql_file "RBAC migration" "$MYSQL_DATABASE" "$ROOT_DIR/database/sql/rbac_migration.sql"
run_sql_file "default BME accounts" "$MYSQL_DATABASE" "$ROOT_DIR/database/sql/seed_users.sql"
run_sql_file "views" "$MYSQL_DATABASE" "$ROOT_DIR/database/sql/views.sql"
run_sql_file "B+ tree indexes" "$MYSQL_DATABASE" "$ROOT_DIR/database/sql/indexes.sql"
run_sql_file "triggers" "$MYSQL_DATABASE" "$ROOT_DIR/database/sql/triggers.sql"

if [[ "${SKIP_DATA_LOAD:-0}" == "1" ]]; then
  echo "[init-db] Skipping CSV and MongoDB load because SKIP_DATA_LOAD=1"
else
  echo "[init-db] Loading cleaned dataset into MySQL and MongoDB"
  (
    cd "$ROOT_DIR"
    node -r dotenv/config database/loader.js
  )
fi

run_sql_file "OLAP warehouse" "$MYSQL_DATABASE" "$ROOT_DIR/database/sql/olap_warehouse.sql"

echo "[init-db] Done."
echo "[init-db] Default accounts:"
echo "  bme_admin01     / BmeAdmin@123"
echo "  bme_manager01   / BmeManager@123"
echo "  bme_engineer01  / BmeEngineer@123"
echo "  bme_analyst01   / BmeAnalyst@123"
