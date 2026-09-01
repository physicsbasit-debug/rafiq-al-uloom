import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Phase 5-2 activity boundaries', () => {
  it('يبقي Activity Catalog فوق ContentRepository دون عقد getActivitiesByLesson داخله', () => {
    const repository = read('src/services/data/content.repository.ts');
    const catalog = read('src/services/activities/activity-catalog.service.ts');

    expect(repository).not.toContain('getActivitiesByLesson');
    expect(catalog).toContain('getGamesByLesson');
    expect(catalog).toContain('getExperimentsByLesson');
  });

  it('يبقي App على Step أنشطة واحد مع المسار القديم للعبة', () => {
    const app = read('src/App.tsx');

    expect(app).toContain("{ name: 'activities'; lessonId: string; unitId: string }");
    expect(app).toContain("{ name: 'game'; lessonId: string; unitId: string }");
    expect(app).not.toContain("{ name: 'experiment';");
    expect(app).not.toContain("{ name: 'simulation';");
    expect(app).not.toContain("{ name: 'inquiry';");
    expect(app).not.toContain("{ name: 'data';");
  });

  it('يبقي LessonExperiments inline ويضيف Hub بصورة additive', () => {
    const lessonView = read('src/features/student/lesson-view/LessonView.tsx');

    expect(lessonView).toContain('<LessonExperiments experiments={experiments} />');
    expect(lessonView).toContain('label="لعبة تعليمية"');
    expect(lessonView).toContain('label="الأنشطة العلمية"');
  });

  it('يبقي Domain Registry بلا React بينما renderer registry في React layer', () => {
    const domainRegistry = read('src/features/activities/activity-registry.ts');
    const rendererRegistry = read('src/features/activities/student-activity-renderer.registry.tsx');

    expect(domainRegistry).not.toMatch(/from ['"]react['"]/);
    expect(rendererRegistry).toContain('MatchingGameRunner');
    expect(rendererRegistry).toContain('ExperimentCard');
  });
});
