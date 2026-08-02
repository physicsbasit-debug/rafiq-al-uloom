#!/usr/bin/env bash
set -euo pipefail

FAILURES=0

fail() {
  echo "✗ FAIL: $1" >&2
  FAILURES=$((FAILURES + 1))
}

pass() {
  echo "✓ $1"
}

STATUS_ENV="$(npx supabase status -o env 2>/dev/null)" || {
  echo "تعذّر تشغيل 'npx supabase status -o env'. تأكد من تشغيل 'npx supabase start' أولاً." >&2
  exit 1
}

eval "$STATUS_ENV"

: "${REST_URL:?REST_URL غير متوفر في مخرجات supabase status}"
: "${PUBLISHABLE_KEY:?PUBLISHABLE_KEY غير متوفر في مخرجات supabase status}"
: "${SERVICE_ROLE_KEY:?SERVICE_ROLE_KEY غير متوفر في مخرجات supabase status}"

DB_CONTAINER="$(docker ps --filter "name=supabase_db_" --format '{{.Names}}' | head -n 1)"

if [[ -z "$DB_CONTAINER" ]]; then
  echo "تعذّر إيجاد حاوية قاعدة بيانات Supabase قيد التشغيل. تأكد من تشغيل 'npx supabase start'." >&2
  exit 1
fi

psql_admin() {
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -tAc "$1"
}

check_sql_value() {
  local description="$1"
  local sql="$2"
  local expected="$3"
  local actual

  actual="$(psql_admin "$sql")"

  if [[ "$actual" == "$expected" ]]; then
    pass "$description"
  else
    fail "$description (الفعلي: '$actual'، المتوقع: '$expected')"
  fi
}

check_privilege() {
  local role="$1"
  local table="$2"
  local privilege="$3"
  local expected="$4"

  check_sql_value \
    "$role على $table: $privilege = $expected" \
    "SELECT has_table_privilege('${role}', 'public.${table}', '${privilege}');" \
    "$expected"
}

anon_rest_status() {
  local table="$1"
  local response_file
  local status

  response_file="$(mktemp)"
  status="$(curl -sS -o "$response_file" -w '%{http_code}' \
    -H "apikey: ${PUBLISHABLE_KEY}" \
    "${REST_URL}/${table}?select=id&limit=1")"
  rm -f "$response_file"
  printf '%s' "$status"
}

rest_count() {
  local table="$1"
  local column="$2"
  local key="$3"

  curl -sS \
    -H "apikey: ${key}" \
    -H "Authorization: Bearer ${key}" \
    "${REST_URL}/${table}?select=${column}" \
  | python3 -c '
import json
import sys

data = json.load(sys.stdin)
print(len(data) if isinstance(data, list) else -1)
'
}

content_tables=(
  grades
  semesters
  subjects
  units
  lessons
  objectives
  questions
  games
  game_objectives
  experiments
)

old_policies=(
  "public read grades"
  "public read semesters"
  "public read subjects"
  "public read units"
  "public read approved lessons"
  "public read objectives of approved lessons"
  "public read approved questions of approved lessons"
  "public read approved games of approved lessons"
  "public read approved experiments of approved lessons"
  "public read objectives of approved games and lessons"
)

new_policies=(
  "active users read grades"
  "active users read semesters"
  "active users read subjects"
  "active users read units"
  "active users read approved lessons"
  "active users read objectives of approved lessons"
  "active users read approved questions of approved lessons"
  "active users read approved games of approved lessons"
  "active users read approved experiments of approved lessons"
  "active users read objectives of approved games and lessons"
)

check_sql_value \
  "جدول public.profiles موجود" \
  "SELECT (to_regclass('public.profiles') IS NOT NULL);" \
  "t"

for constraint in profiles_id_fkey profiles_role_check profiles_status_check; do
  check_sql_value \
    "قيد $constraint موجود" \
    "SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${constraint}' AND conrelid = 'public.profiles'::regclass);" \
    "t"
done

check_sql_value \
  "Trigger on_auth_user_created موجود على auth.users" \
  "SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND tgrelid = 'auth.users'::regclass AND NOT tgisinternal);" \
  "t"

check_sql_value \
  "دالة handle_new_auth_user تستخدم SECURITY DEFINER" \
  "SELECT prosecdef FROM pg_proc WHERE oid = 'public.handle_new_auth_user()'::regprocedure;" \
  "t"

check_sql_value \
  "دالة handle_new_auth_user ذات search_path فارغ" \
  "SELECT EXISTS (SELECT 1 FROM unnest(proconfig) AS setting WHERE setting IN ('search_path=\"\"', 'search_path=')) FROM pg_proc WHERE oid = 'public.handle_new_auth_user()'::regprocedure;" \
  "t"

check_sql_value \
  "Trigger set_profiles_updated_at موجود" \
  "SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_profiles_updated_at' AND tgrelid = 'public.profiles'::regclass AND NOT tgisinternal);" \
  "t"

check_sql_value \
  "RLS مفعّل على profiles" \
  "SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass;" \
  "t"

check_sql_value \
  "سياسة قراءة الملف الشخصي الوحيدة موجودة" \
  "SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'users read own profile' AND cmd = 'SELECT';" \
  "1"

check_sql_value \
  "لا توجد سياسات كتابة على profiles" \
  "SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL');" \
  "0"

check_privilege anon profiles SELECT f
check_privilege anon profiles INSERT f
check_privilege anon profiles UPDATE f
check_privilege anon profiles DELETE f
check_privilege authenticated profiles SELECT t
check_privilege authenticated profiles INSERT f
check_privilege authenticated profiles UPDATE f
check_privilege authenticated profiles DELETE f
check_privilege service_role profiles SELECT t
check_privilege service_role profiles UPDATE t
check_privilege service_role profiles INSERT f
check_privilege service_role profiles DELETE f

for table in "${content_tables[@]}"; do
  check_privilege anon "$table" SELECT f
  check_privilege authenticated "$table" SELECT t
  check_privilege service_role "$table" SELECT t
done

for policy in "${old_policies[@]}"; do
  check_sql_value \
    "السياسة القديمة محذوفة: $policy" \
    "SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname = '${policy}';" \
    "0"
done

for policy in "${new_policies[@]}"; do
  check_sql_value \
    "سياسة C2-A موجودة: $policy" \
    "SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname = '${policy}' AND cmd = 'SELECT' AND roles = ARRAY['authenticated']::name[];" \
    "1"
done

check_sql_value \
  "عدد سياسات محتوى C2-A يساوي 10" \
  "SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 'active users read%';" \
  "10"

check_sql_value \
  "لا يوجد مستخدم Auth بلا Profile" \
  "SELECT count(*) FROM auth.users au LEFT JOIN public.profiles p ON p.id = au.id WHERE p.id IS NULL;" \
  "0"

anon_grades_status="$(anon_rest_status grades)"
if [[ "$anon_grades_status" =~ ^2 ]]; then
  fail "anon استطاع قراءة grades عبر Data API (HTTP $anon_grades_status)"
else
  pass "anon محجوب عن grades عبر Data API (HTTP $anon_grades_status)"
fi

anon_profiles_status="$(anon_rest_status profiles)"
if [[ "$anon_profiles_status" =~ ^2 ]]; then
  fail "anon استطاع قراءة profiles عبر Data API (HTTP $anon_profiles_status)"
else
  pass "anon محجوب عن profiles عبر Data API (HTTP $anon_profiles_status)"
fi

service_grade_count="$(rest_count grades id "$SERVICE_ROLE_KEY")"
service_lesson_count="$(rest_count lessons id "$SERVICE_ROLE_KEY")"

if [[ "$service_grade_count" -eq 1 ]]; then
  pass "service_role تقرأ grades عبر Data API"
else
  fail "service_role لم تقرأ grades كما هو متوقع (العدد=$service_grade_count)"
fi

if [[ "$service_lesson_count" -eq 4 ]]; then
  pass "service_role تقرأ lessons الأربع وتحافظ على عقد B3c"
else
  fail "service_role لم تقرأ lessons الأربع (العدد=$service_lesson_count)"
fi

check_count() {
  local table="$1"
  local expected="$2"
  local actual

  actual="$(psql_admin "SELECT count(*) FROM public.${table};")"

  if [[ "$actual" -eq "$expected" ]]; then
    pass "$table: $actual صف (مطابق للمتوقَّع)"
  else
    fail "$table: $actual صف (متوقَّع $expected)"
  fi
}

check_count grades 1
check_count semesters 2
check_count subjects 1
check_count units 1
check_count lessons 4
check_count objectives 8
check_count questions 44
check_count games 4
check_count experiments 4
check_count game_objectives 7

review_count="$(psql_admin "SELECT count(*) FROM public.questions WHERE purpose = 'review';")"
mastery_count="$(psql_admin "SELECT count(*) FROM public.questions WHERE purpose = 'mastery';")"

if [[ "$review_count" -gt 0 && "$mastery_count" -gt 0 ]]; then
  pass "purpose: $review_count مراجعة، $mastery_count إتقان"
else
  fail "purpose: توزيع غير متوقَّع (مراجعة=$review_count، إتقان=$mastery_count)"
fi

bad_positions="$(psql_admin "
  SELECT count(*)
  FROM (
    SELECT game_id, position, count(*)
    FROM public.game_objectives
    GROUP BY game_id, position
    HAVING count(*) > 1
  ) t;
")"

if [[ "$bad_positions" -eq 0 ]]; then
  pass "game_objectives.position: لا تكرار ضمن نفس اللعبة"
else
  fail "game_objectives.position: يوجد تكرار position داخل لعبة واحدة"
fi

echo ""

if [[ "$FAILURES" -gt 0 ]]; then
  echo "فشل التحقق: $FAILURES مشكلة." >&2
  exit 1
fi

echo "نجح تحقق C2-A: profiles + GRANT + RLS + Data API + عقد B3c + سلامة البيانات."
