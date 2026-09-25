#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REPORT_PATH="${PHASE_6_5_REPORT_PATH:-${TMPDIR:-/tmp}/rafiq-phase-6-5-recovery-report.json}"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/rafiq-phase-6-5.XXXXXX")"
DATA_DUMP="$TMP_ROOT/data.sql"
SOURCE_INVENTORY="$TMP_ROOT/source-inventory.tsv"
RESTORE_INVENTORY="$TMP_ROOT/restore-inventory.tsv"
CONTAINER_DATA="/tmp/rafiq-phase-6-5-data-$$.sql"
DB_CONTAINER=""
START_EPOCH="$(date +%s)"
DRILL_COMPLETE=0

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

cleanup() {
  if [[ -n "$DB_CONTAINER" ]]; then
    docker exec "$DB_CONTAINER" rm -f "$CONTAINER_DATA" >/dev/null 2>&1 || true
  fi

  if ((DRILL_COMPLETE == 1)); then
    rm -rf "$TMP_ROOT"
  else
    chmod -R go-rwx "$TMP_ROOT" >/dev/null 2>&1 || true
    if [[ -s "$DATA_DUMP" ]]; then
      echo "RECOVERY_BACKUP_RETAINED_ON_FAILURE=$DATA_DUMP" >&2
    else
      rm -rf "$TMP_ROOT"
    fi
  fi
}
trap cleanup EXIT

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

find_db_container() {
  local project_id
  local expected

  project_id="$(
    awk -F '=' '
      /^[[:space:]]*project_id[[:space:]]*=/ {
        value=$2
        gsub(/[[:space:]"]/, "", value)
        print value
        exit
      }
    ' supabase/config.toml
  )"

  [[ -n "$project_id" ]] || fail "could not resolve project_id from supabase/config.toml"
  expected="supabase_db_${project_id}"

  DB_CONTAINER="$(
    docker ps --format '{{.Names}}' |
      grep -Fx "$expected" |
      head -n 1 || true
  )"

  [[ -n "$DB_CONTAINER" ]] || fail "local Supabase database container is not running: $expected"
}

validate_identifier() {
  [[ "$1" =~ ^[a-z_][a-z0-9_]*$ ]]
}

capture_inventory() {
  local database="$1"
  local output="$2"
  local schema
  local table
  local result

  : >"$output"

  while IFS='|' read -r schema table; do
    [[ -n "$schema" && -n "$table" ]] || continue
    validate_identifier "$schema" || fail "unexpected schema identifier in recovery inventory: $schema"
    validate_identifier "$table" || fail "unexpected table identifier in recovery inventory: $table"

    result="$(
      docker exec "$DB_CONTAINER" \
        psql -U postgres -d "$database" -At -v ON_ERROR_STOP=1 \
        -c "
          SELECT
            count(*)::text || '|' ||
            md5(
              COALESCE(
                string_agg(row_hash, '' ORDER BY row_hash),
                ''
              )
            )
          FROM (
            SELECT md5(to_jsonb(t)::text) AS row_hash
            FROM ${schema}.${table} AS t
          ) AS rows;
        "
    )"

    printf '%s|%s|%s\n' "$schema" "$table" "$result" >>"$output"
  done < <(
    docker exec "$DB_CONTAINER" \
      psql -U postgres -d "$database" -At -F '|' -v ON_ERROR_STOP=1 \
      -c "
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname IN ('public', 'private', 'auth')
           OR (
             schemaname = 'supabase_migrations'
             AND tablename = 'schema_migrations'
           )
        ORDER BY schemaname, tablename;
      "
  )
}

write_report() {
  local backup_sha="$1"
  local backup_bytes="$2"
  local table_count="$3"
  local row_count="$4"
  local duration_seconds="$5"

  mkdir -p "$(dirname "$REPORT_PATH")"

  BACKUP_SHA="$backup_sha" \
  BACKUP_BYTES="$backup_bytes" \
  TABLE_COUNT="$table_count" \
  ROW_COUNT="$row_count" \
  DURATION_SECONDS="$duration_seconds" \
  REPORT_PATH="$REPORT_PATH" \
  node <<'NODE'
import { writeFileSync } from 'node:fs';

const report = {
  phase: '6-5',
  generatedAt: new Date().toISOString(),
  localOnly: true,
  sourceDatabase: 'local Supabase PostgreSQL',
  schemaRecovery: 'forward-only repository migrations via local db reset --no-seed',
  dataBackup: 'supabase db dump --local --data-only --use-copy --schema public,private,auth',
  verifiedSchemas: ['public', 'private', 'auth', 'supabase_migrations'],
  backupSha256: process.env.BACKUP_SHA,
  backupBytes: Number(process.env.BACKUP_BYTES),
  verifiedTableCount: Number(process.env.TABLE_COUNT),
  verifiedRowCount: Number(process.env.ROW_COUNT),
  restoreExact: true,
  forwardOnlyMigrationGuard: 'PASS',
  durationSeconds: Number(process.env.DURATION_SECONDS),
  backupArtifactRetained: false,
};

writeFileSync(process.env.REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, {
  encoding: 'utf8',
  mode: 0o600,
});
NODE
}

require_command docker
require_command node
require_command sha256sum

printf '\n==> Forward-only migration guard\n'
node scripts/check-forward-only-migrations.mjs

printf '\n==> Local Supabase readiness\n'
npx --no-install supabase status >/dev/null 2>&1 ||
  fail "local Supabase is not running; start it before the recovery drill"

find_db_container
echo "PASS: local database container resolved"

printf '\n==> Source recovery inventory\n'
capture_inventory postgres "$SOURCE_INVENTORY"
[[ -s "$SOURCE_INVENTORY" ]] || fail "source recovery inventory is empty"
SOURCE_TABLE_COUNT="$(wc -l <"$SOURCE_INVENTORY" | tr -d ' ')"
SOURCE_ROW_COUNT="$(awk -F '|' '{ total += $3 } END { print total + 0 }' "$SOURCE_INVENTORY")"

((SOURCE_TABLE_COUNT > 1)) || fail "source recovery inventory is implausibly small"
echo "PASS: captured $SOURCE_TABLE_COUNT table fingerprints across recovery schemas"
echo "PASS: captured $SOURCE_ROW_COUNT logical rows without exposing row values"

printf '\n==> Supabase-native logical data backup\n'
umask 077
npx --no-install supabase db dump \
  --local \
  --data-only \
  --use-copy \
  --schema public,private,auth \
  --file "$DATA_DUMP"

[[ -s "$DATA_DUMP" ]] || fail "Supabase logical data backup is empty"
BACKUP_SHA="$(sha256sum "$DATA_DUMP" | awk '{print $1}')"
BACKUP_BYTES="$(wc -c <"$DATA_DUMP" | tr -d ' ')"
[[ "$BACKUP_SHA" =~ ^[0-9a-f]{64}$ ]] || fail "could not compute backup SHA-256"

echo "PASS: Supabase-filtered logical data backup created ($BACKUP_BYTES bytes)"
echo "PASS: backup SHA-256 computed without printing backup contents"

printf '\n==> Rebuild schema from immutable migrations\n'
npx --no-install supabase db reset --no-seed

find_db_container
echo "PASS: clean local recovery target rebuilt from migrations without seed data"

printf '\n==> Restore logical data into clean recovery target\n'
docker cp "$DATA_DUMP" "${DB_CONTAINER}:${CONTAINER_DATA}" >/dev/null

docker exec "$DB_CONTAINER" \
  psql -U postgres -d postgres \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command 'SET session_replication_role = replica' \
  --file "$CONTAINER_DATA"

echo "PASS: Supabase-filtered data restored with triggers disabled during import"

printf '\n==> Restored recovery inventory\n'
capture_inventory postgres "$RESTORE_INVENTORY"

if ! diff -u "$SOURCE_INVENTORY" "$RESTORE_INVENTORY"; then
  fail "restored database inventory differs from the source recovery inventory"
fi

echo "PASS: restored table counts and content fingerprints match source exactly"

printf '\n==> Migration-history verification\n'
MIGRATION_COUNT="$(
  docker exec "$DB_CONTAINER" \
    psql -U postgres -d postgres -At -v ON_ERROR_STOP=1 \
    -c "SELECT count(*) FROM supabase_migrations.schema_migrations;"
)"
[[ "$MIGRATION_COUNT" =~ ^[1-9][0-9]*$ ]] ||
  fail "migration history is missing after schema rebuild"
echo "PASS: migration history rebuilt with $MIGRATION_COUNT applied migration record(s)"

END_EPOCH="$(date +%s)"
DURATION_SECONDS="$((END_EPOCH - START_EPOCH))"

write_report \
  "$BACKUP_SHA" \
  "$BACKUP_BYTES" \
  "$SOURCE_TABLE_COUNT" \
  "$SOURCE_ROW_COUNT" \
  "$DURATION_SECONDS"

DRILL_COMPLETE=1

printf '\nBACKUP_RESTORE_DRILL=PASS\n'
printf 'REPORT=%s\n' "$REPORT_PATH"
printf 'DURATION_SECONDS=%s\n' "$DURATION_SECONDS"
printf 'BACKUP_ARTIFACT_RETAINED=false\n'
