import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function existingSources(paths: readonly string[]): string[] {
  return paths.filter((path) => existsSync(path)).map(source);
}

function migrationSources(): string[] {
  return readdirSync('supabase/migrations')
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => source(`supabase/migrations/${name}`));
}

const futureDataBoundaryFiles = [
  'src/types/data-activity.types.ts',
  'src/features/data-activities/engine/data-activity.engine.ts',
  'src/features/data-activities/DataActivityRunner.tsx',
  'supabase/migrations/20260903080000_add_data_activities.sql',
  'src/services/data/supabase-content.mappers.ts',
  'src/content/seed/grade10-physics-waves.ts',
] as const;

const answerKeyPattern =
  /expected_?value|expected_?answer|correct_?value|answer_?key|model_?answer|reference_?answer|teacher_?answer/i;

describe('Phase 5-4B data / graph boundaries', () => {
  it('يبقي Data ضمن Activity Domain والـRegistry العامين', () => {
    expect(source('src/types/activity.types.ts')).toMatch(
      /LearningActivityKind[\s\S]*['"]data['"]/
    );

    const registry = source('src/features/activities/activity-registry.ts');
    expect(registry).toMatch(/kind:\s*['"]data['"]/);
    expect(registry).not.toMatch(/from\s+['"]react['"]|from\s+['"]react\//);
  });

  it('يبقي App وLessonView بلا routing خاص ببيانات ورسوم', () => {
    expect(source('src/App.tsx')).not.toMatch(
      /DataActivityRunner|DataGraphActivity|ScientificDataActivity|data_graph_v1/
    );

    expect(source('src/features/student/lesson-view/LessonView.tsx')).not.toMatch(
      /DataActivityRunner|DataGraphActivity|ScientificDataActivity|data_graph_v1/
    );
  });

  it('يمنع جدول activities العام ومحاولات Data الدائمة عبر جميع migrations', () => {
    const migrations = migrationSources().join('\n');

    expect(migrations).not.toMatch(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.activities\b/i);
    expect(migrations).not.toMatch(
      /data_activity_attempts|data_activity_results|activity_attempts|data_attempts/i
    );
  });

  it('يفعل حارس سرية answer-key تلقائيًا على ملفات Data عند ظهورها', () => {
    for (const fileSource of existingSources(futureDataBoundaryFiles)) {
      expect(fileSource).not.toMatch(answerKeyPattern);
    }
  });

  it('يبقي محرك Data المستقبلي حتميًا وخاليًا من UI والشبكة والتنفيذ الديناميكي', () => {
    const enginePath = 'src/features/data-activities/engine/data-activity.engine.ts';

    if (!existsSync(enginePath)) {
      return;
    }

    expect(source(enginePath)).not.toMatch(
      /\breact\b|\bwindow\b|\bdocument\b|\bfetch\s*\(|XMLHttpRequest|sendBeacon|supabase|localStorage|sessionStorage|Date\.now|Math\.random|\beval\s*\(|new\s+Function|MasteryResult/i
    );
  });

  it('يبقي DataActivityRunner المستقبلي session-only بلا persistence أو network أو Mastery writes', () => {
    const runnerPath = 'src/features/data-activities/DataActivityRunner.tsx';

    if (!existsSync(runnerPath)) {
      return;
    }

    expect(source(runnerPath)).not.toMatch(
      /localStorage|sessionStorage|IndexedDB|indexedDB|\bfetch\s*\(|XMLHttpRequest|sendBeacon|supabase|MasteryResult|masteryResult|submit_mastery_attempt/i
    );
  });
});
