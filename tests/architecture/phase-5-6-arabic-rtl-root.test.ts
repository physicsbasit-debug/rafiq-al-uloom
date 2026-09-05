import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Phase 5-6D Arabic root and RTL contract', () => {
  it('يثبت العربية وRTL على جذر HTML نفسه', () => {
    const indexHtml = read('index.html');

    expect(indexHtml).toMatch(/<html\s+lang=["']ar["']\s+dir=["']rtl["']>/);
    expect(indexHtml).not.toMatch(/<html[^>]*\blang=["']en["']/);
    expect(indexHtml).not.toMatch(/<html[^>]*\bdir=["']ltr["']/);
  });

  it('يبقي عنوان المتصفح عربيًا', () => {
    const indexHtml = read('index.html');

    expect(indexHtml).toContain('<title>رفيق العلوم</title>');
  });

  it('لا يضيف اتجاه LTR صريحًا إلى الأسطح الأساسية', () => {
    const criticalSurfaces = [
      'src/App.tsx',
      'src/features/activities/StudentActivityHub.tsx',
      'src/features/activities/StudentActivityHost.tsx',
      'src/features/experiments/experiment-card.tsx',
    ];

    for (const path of criticalSurfaces) {
      expect(read(path), path).not.toMatch(/dir\s*=\s*["']ltr["']/);
    }
  });

  it('يبقي رسائل السلامة المضافة عربية ولا يسرب رسائل تقنية خامًا', () => {
    const safetyPolicy = read('src/features/activities/student-experiment-safety.ts');
    const studentHost = read('src/features/activities/StudentActivityHost.tsx');

    expect(safetyPolicy).toContain('هذه التجربة تُنفذ بإشراف المعلم فقط');
    expect(safetyPolicy).toContain('تنفيذ هذه التجربة محصور في المختبر');
    expect(safetyPolicy).toContain('هذه التجربة غير متاحة للتنفيذ للطالب');
    expect(studentHost).toContain('هذه التجربة غير متاحة للتنفيذ للطالب بسبب متطلبات السلامة');

    expect(safetyPolicy).not.toMatch(/\b(?:Error|Forbidden|Unauthorized|Invalid request)\b/);
    expect(studentHost).not.toMatch(/\b(?:Error|Forbidden|Unauthorized|Invalid request)\b/);
  });
});
