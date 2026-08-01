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

# تحميل القيم مباشرة من Supabase CLI
STATUS_ENV="$(npx supabase status -o env 2>/dev/null)" || {
  echo "تعذّر تشغيل 'npx supabase status -o env'. تأكد من تشغيل 'npx supabase start' أولاً." >&2
  exit 1
}

eval "$STATUS_ENV"

: "${REST_URL:?REST_URL غير متوفر في مخرجات supabase status}"
: "${PUBLISHABLE_KEY:?PUBLISHABLE_KEY غير متوفر في مخرجات supabase status}"

# تحديد حاوية قاعدة البيانات
DB_CONTAINER="$(docker ps --filter "name=supabase_db_" --format '{{.Names}}' | head -n 1)"

if [[ -z "$DB_CONTAINER" ]]; then
  echo "تعذّر إيجاد حاوية قاعدة بيانات Supabase قيد التشغيل. تأكد من تشغيل 'npx supabase start'." >&2
  exit 1
fi

psql_admin() {
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -tAc "$1"
}

# استعلام REST وإرجاع عدد الصفوف فقط
rest_count() {
  local table="$1"
  local column="${2:-id}"

  curl -sS \
    -H "apikey: ${PUBLISHABLE_KEY}" \
    "${REST_URL}/${table}?select=${column}" \
  | python3 -c '
import json
import sys

data = json.load(sys.stdin)

if not isinstance(data, list):
    print(-1)
else:
    print(len(data))
'
}

# جداول الفهرس العامة
for table in grades semesters subjects units; do
  count="$(rest_count "$table")"

  if [[ "$count" -gt 0 ]]; then
    pass "$table تُرجع $count صفًا عبر Data API (متوقَّع: قراءة عامة)"
  else
    fail "$table لا تُرجع أي صف عبر Data API — يجب أن تكون مرئية للمفتاح العام"
  fi
done

# الجداول التفصيلية المحجوبة لأن حالتها draft
for table in lessons objectives questions games experiments; do
  count="$(rest_count "$table")"

  if [[ "$count" -eq 0 ]]; then
    pass "$table لا تُظهر أي صف للمفتاح العام (متوقَّع: المحتوى draft)"
  else
    fail "$table أظهرت $count صفًا عبر Data API — يجب أن تكون محجوبة بالكامل حاليًا"
  fi
done

# game_objectives لا يحتوي عمود id، لذلك نستخدم game_id
count="$(rest_count game_objectives game_id)"

if [[ "$count" -eq 0 ]]; then
  pass "game_objectives لا تُظهر أي صف للمفتاح العام (متوقَّع: المحتوى draft)"
else
  fail "game_objectives أظهرت $count صفًا عبر Data API — يجب أن تكون محجوبة بالكامل حاليًا"
fi

# فحص أعداد الصفوف داخل قاعدة البيانات
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

# فحص purpose
review_count="$(psql_admin "SELECT count(*) FROM public.questions WHERE purpose = 'review';")"
mastery_count="$(psql_admin "SELECT count(*) FROM public.questions WHERE purpose = 'mastery';")"

if [[ "$review_count" -gt 0 && "$mastery_count" -gt 0 ]]; then
  pass "purpose: $review_count مراجعة، $mastery_count إتقان"
else
  fail "purpose: توزيع غير متوقَّع (مراجعة=$review_count، إتقان=$mastery_count)"
fi

# فحص عدم تكرار position داخل اللعبة نفسها
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

echo "نجح التحقق الكامل: GRANT + RLS + Data API + البيانات الإدارية متطابقة."
