import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

describe('Phase 6-5 backup / restore / migration recovery contract', () => {
  it('exposes one explicit local-only restore drill and keeps it outside ordinary CI', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
    const workflow = read('.github/workflows/ci.yml');
    const verifier = read('scripts/verify-backup-restore-recovery.sh');

    expect(pkg.scripts?.['verify:backup-recovery']).toBe(
      'bash scripts/verify-backup-restore-recovery.sh'
    );
    expect(workflow).not.toContain('verify:backup-recovery');
    expect(verifier).toContain('localOnly: true');
    expect(verifier).toContain('local Supabase is not running');
  });

  it('uses the Supabase-native filtered dump path instead of raw whole-cluster pg_dump', () => {
    const verifier = read('scripts/verify-backup-restore-recovery.sh');

    expect(verifier).toContain('supabase db dump');
    expect(verifier).toContain('--local');
    expect(verifier).toContain('--data-only');
    expect(verifier).toContain('--use-copy');
    expect(verifier).toContain('--schema public,private,auth');
    expect(verifier).not.toContain('--schema storage');
    expect(verifier).not.toContain('buckets_vectors');
    expect(verifier).not.toContain('pg_dump -U postgres -d postgres');
    expect(verifier).not.toContain('pg_restore');
  });

  it('rebuilds schema from immutable migrations, restores data with triggers disabled, and compares exact fingerprints', () => {
    const verifier = read('scripts/verify-backup-restore-recovery.sh');

    expect(verifier).toContain('supabase db reset --no-seed');
    expect(verifier).toContain('SET session_replication_role = replica');
    expect(verifier).toContain('capture_inventory postgres "$SOURCE_INVENTORY"');
    expect(verifier).toContain('capture_inventory postgres "$RESTORE_INVENTORY"');
    expect(verifier).toContain('diff -u "$SOURCE_INVENTORY" "$RESTORE_INVENTORY"');
    expect(verifier).toContain('md5(to_jsonb(t)::text)');
  });

  it('covers application data, private state, auth data, and migration history without printing rows', () => {
    const verifier = read('scripts/verify-backup-restore-recovery.sh');

    expect(verifier).toContain("schemaname IN ('public', 'private', 'auth')");
    expect(verifier).toContain("schemaname = 'supabase_migrations'");
    expect(verifier).toContain("tablename = 'schema_migrations'");
    expect(verifier).not.toContain("tablename = 'seed_files'");
    expect(verifier).toContain('supabase_migrations.schema_migrations');
    expect(verifier).toContain('without exposing row values');
    expect(verifier).not.toContain('SELECT *');
  });

  it('does not let capture_inventory consume its own table-list stdin', () => {
    const verifier = read('scripts/verify-backup-restore-recovery.sh');
    const inventoryStart = verifier.indexOf('capture_inventory() {');
    const inventoryEnd = verifier.indexOf('write_report() {');

    expect(inventoryStart).toBeGreaterThanOrEqual(0);
    expect(inventoryEnd).toBeGreaterThan(inventoryStart);

    const inventoryBlock = verifier.slice(inventoryStart, inventoryEnd);
    expect(inventoryBlock).toContain('docker exec "$DB_CONTAINER"');
    expect(inventoryBlock).not.toContain('docker exec -i "$DB_CONTAINER"');
  });

  it('keeps migration recovery forward-only, local-only, and retains the backup if the destructive drill fails', () => {
    const verifier = read('scripts/verify-backup-restore-recovery.sh');
    const docs = read('docs/PHASE_6_5_BACKUP_RESTORE_RECOVERY.md');

    expect(verifier).toContain('node scripts/check-forward-only-migrations.mjs');
    expect(verifier).toContain('RECOVERY_BACKUP_RETAINED_ON_FAILURE');
    expect(verifier).not.toContain('--linked');
    expect(verifier).not.toContain('--db-url');
    expect(docs).toContain('لا `db reset` على الإنتاج');
    expect(docs).toContain('migration تصحيحية جديدة');
    expect(docs).toContain('pre-migration backup');
  });

  it('freezes practical retention, RPO/RTO targets, and deployment-owned production verification', () => {
    const docs = read('docs/PHASE_6_5_BACKUP_RESTORE_RECOVERY.md');

    expect(docs).toContain('RPO');
    expect(docs).toContain('24 ساعة');
    expect(docs).toContain('RTO');
    expect(docs).toContain('ساعتين');
    expect(docs).toContain('14 يومًا');
    expect(docs).toContain('8 أسابيع');
    expect(docs).toContain('6 أشهر');
    expect(docs).toContain('Phase 6-7');
  });
});
