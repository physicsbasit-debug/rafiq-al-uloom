import { describe, expect, it } from 'vitest';

import { orderEntitiesByIds, uniqueIdsInOrder } from '@services/data/content-ordering';

describe('content ordering', () => {
  it('يحافظ على ترتيب ظهور مادتين داخل الوحدات لا ترتيب صفوف المواد الوارد من المصدر', () => {
    const subjects = [
      { id: 'physics', name: 'الفيزياء' },
      { id: 'chemistry', name: 'الكيمياء' },
    ];

    expect(orderEntitiesByIds(subjects, ['chemistry', 'physics'])).toEqual([
      subjects[1],
      subjects[0],
    ]);
  });

  it('يحافظ على ترتيب المعرّفات المطلوبة عند جلب الأهداف', () => {
    const objectives = [{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }];

    expect(orderEntitiesByIds(objectives, ['o3', 'o1'])).toEqual([objectives[2], objectives[0]]);
  });

  it('يحذف تكرار المعرّفات مع إبقاء أول ظهور لها', () => {
    expect(uniqueIdsInOrder(['chemistry', 'physics', 'chemistry'])).toEqual([
      'chemistry',
      'physics',
    ]);
  });
});
