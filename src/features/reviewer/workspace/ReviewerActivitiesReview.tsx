import type { LessonRevisionPayload } from '@services/authoring';

interface ReviewerActivitiesReviewProps {
  readonly payload: LessonRevisionPayload;
}

function objectiveLabels(payload: LessonRevisionPayload, objectiveKeys: readonly string[]): string {
  if (objectiveKeys.length === 0) {
    return 'لا توجد أهداف مرتبطة';
  }

  const byKey = new Map(
    payload.objectives.map((objective) => [objective.key, objective.text] as const)
  );

  return objectiveKeys.map((key) => byKey.get(key) ?? `هدف غير موجود: ${key}`).join('، ');
}

function safetyLabel(value: LessonRevisionPayload['experiments'][number]['safetyLevel']): string {
  switch (value) {
    case 'safe_home':
      return 'يمكن تنفيذها في المنزل';

    case 'teacher_supervised':
      return 'بإشراف المعلم';

    case 'lab_only':
      return 'في المختبر فقط';

    case 'not_allowed':
      return 'غير مسموح بالتنفيذ';
  }
}

function presentationLabel(
  value: LessonRevisionPayload['dataActivities'][number]['config']['presentation']['mode']
): string {
  switch (value) {
    case 'table':
      return 'جدول';

    case 'line_graph':
      return 'رسم خطي';

    case 'table_and_line_graph':
      return 'جدول ورسم خطي';
  }
}

function dataTaskRuleLabel(
  task: LessonRevisionPayload['dataActivities'][number]['config']['tasks'][number]
): string {
  switch (task.rule.kind) {
    case 'read_value':
      return `قراءة قيمة من السلسلة ${task.rule.seriesId} عند النقطة ${task.rule.pointIndex + 1}`;

    case 'difference':
      return `إيجاد الفرق في السلسلة ${task.rule.seriesId} بين النقطتين ${
        task.rule.leftIndex + 1
      } و${task.rule.rightIndex + 1}`;

    case 'mean':
      return `حساب المتوسط في السلسلة ${task.rule.seriesId} للنقاط ${task.rule.pointIndices
        .map((index) => index + 1)
        .join('، ')}`;
  }
}

export function ReviewerActivitiesReview({ payload }: ReviewerActivitiesReviewProps) {
  return (
    <section
      aria-labelledby="reviewer-activities-title"
      style={{
        marginTop: '1.5rem',
        display: 'grid',
        gap: '1.5rem',
      }}
    >
      <h3 id="reviewer-activities-title">الأنشطة العلمية</h3>

      <section aria-labelledby="reviewer-games-title">
        <h4 id="reviewer-games-title">ألعاب المطابقة</h4>

        {payload.games.length === 0 ? (
          <p>لا توجد ألعاب مطابقة في هذه النسخة.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '1rem',
            }}
          >
            {payload.games.map((game, index) => (
              <article key={game.key} aria-label={`تفاصيل لعبة المطابقة ${index + 1}`}>
                <div>
                  <strong>العنوان:</strong> {game.title}
                </div>

                <div>
                  <strong>التعليمات:</strong> {game.instructions}
                </div>

                <div>
                  <strong>أهداف التعلم:</strong> {objectiveLabels(payload, game.objectiveKeys)}
                </div>

                <div>
                  <strong>عناصر المطابقة:</strong>

                  <ol>
                    {game.items.map((item, itemIndex) => (
                      <li key={`${game.key}-${itemIndex}`}>
                        {item.left} ↔ {item.right}
                      </li>
                    ))}
                  </ol>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="reviewer-experiments-title">
        <h4 id="reviewer-experiments-title">التجارب</h4>

        {payload.experiments.length === 0 ? (
          <p>لا توجد تجارب في هذه النسخة.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '1rem',
            }}
          >
            {payload.experiments.map((experiment, index) => (
              <article key={experiment.key} aria-label={`تفاصيل التجربة ${index + 1}`}>
                <div>
                  <strong>العنوان:</strong> {experiment.title}
                </div>

                <div>
                  <strong>الهدف الوصفي:</strong> {experiment.objective}
                </div>

                <div>
                  <strong>أهداف التعلم:</strong>{' '}
                  {objectiveLabels(payload, experiment.objectiveKeys)}
                </div>

                <div>
                  <strong>مستوى السلامة:</strong> {safetyLabel(experiment.safetyLevel)}
                </div>

                <div>
                  <strong>الأدوات:</strong>{' '}
                  {experiment.tools.length ? experiment.tools.join('، ') : 'لا يوجد'}
                </div>

                <div>
                  <strong>الخطوات:</strong>

                  <ol>
                    {experiment.steps.map((step, stepIndex) => (
                      <li key={`${experiment.key}-step-${stepIndex}`}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div>
                  <strong>ملاحظات السلامة:</strong>{' '}
                  {experiment.safetyNotes.length ? experiment.safetyNotes.join('، ') : 'لا يوجد'}
                </div>

                <div>
                  <strong>موجه الملاحظة:</strong> {experiment.observationPrompt}
                </div>

                <div>
                  <strong>موجه الاستنتاج:</strong> {experiment.conclusionPrompt}
                </div>

                <div>
                  <strong>البديل المنزلي:</strong> {experiment.homeAlternative ?? 'لا يوجد'}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="reviewer-simulations-title">
        <h4 id="reviewer-simulations-title">المحاكاة</h4>

        {payload.simulations.length === 0 ? (
          <p>لا توجد محاكاة في هذه النسخة.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '1rem',
            }}
          >
            {payload.simulations.map((simulation, index) => (
              <article key={simulation.key} aria-label={`تفاصيل المحاكاة ${index + 1}`}>
                <div>
                  <strong>العنوان:</strong> {simulation.title}
                </div>

                <div>
                  <strong>التعليمات:</strong> {simulation.instructions}
                </div>

                <div>
                  <strong>أهداف التعلم:</strong>{' '}
                  {objectiveLabels(payload, simulation.objectiveKeys)}
                </div>

                <div>
                  <strong>المحرك:</strong> {simulation.config.engineKind}
                </div>

                <div>
                  <strong>سرعة الوسط:</strong> {simulation.config.mediumSpeedMps} m/s
                </div>

                <div>
                  <strong>نطاق التردد:</strong> {simulation.config.frequencyHz.min} إلى{' '}
                  {simulation.config.frequencyHz.max} Hz، خطوة {simulation.config.frequencyHz.step}،
                  ابتدائي {simulation.config.frequencyHz.initial}
                </div>

                <div>
                  <strong>نطاق السعة:</strong> {simulation.config.amplitudeM.min} إلى{' '}
                  {simulation.config.amplitudeM.max} m، خطوة {simulation.config.amplitudeM.step}،
                  ابتدائي {simulation.config.amplitudeM.initial}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="reviewer-inquiries-title">
        <h4 id="reviewer-inquiries-title">أنشطة الاستقصاء</h4>

        {payload.inquiries.length === 0 ? (
          <p>لا توجد أنشطة استقصاء في هذه النسخة.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '1rem',
            }}
          >
            {payload.inquiries.map((inquiry, index) => (
              <article key={inquiry.key} aria-label={`تفاصيل الاستقصاء ${index + 1}`}>
                <div>
                  <strong>العنوان:</strong> {inquiry.title}
                </div>

                <div>
                  <strong>التعليمات:</strong> {inquiry.instructions}
                </div>

                <div>
                  <strong>أهداف التعلم:</strong> {objectiveLabels(payload, inquiry.objectiveKeys)}
                </div>

                <div>
                  <strong>السياق العلمي:</strong> {inquiry.context}
                </div>

                <div>
                  <strong>السؤال المحوري:</strong> {inquiry.drivingQuestion}
                </div>

                <div>
                  <strong>موجه الفرضية:</strong> {inquiry.hypothesisPrompt}
                </div>

                <div>
                  <strong>موجه الملاحظة:</strong> {inquiry.observationPrompt}
                </div>

                <div>
                  <strong>موجه الاستنتاج:</strong> {inquiry.conclusionPrompt}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="reviewer-data-title">
        <h4 id="reviewer-data-title">أنشطة البيانات والرسوم</h4>

        {payload.dataActivities.length === 0 ? (
          <p>لا توجد أنشطة بيانات في هذه النسخة.</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '1rem',
            }}
          >
            {payload.dataActivities.map((activity, index) => (
              <article key={activity.key} aria-label={`تفاصيل نشاط البيانات ${index + 1}`}>
                <div>
                  <strong>العنوان:</strong> {activity.title}
                </div>

                <div>
                  <strong>التعليمات:</strong> {activity.instructions}
                </div>

                <div>
                  <strong>أهداف التعلم:</strong> {objectiveLabels(payload, activity.objectiveKeys)}
                </div>

                <div>
                  <strong>السياق العلمي:</strong> {activity.config.context}
                </div>

                <div>
                  <strong>طريقة العرض:</strong>{' '}
                  {presentationLabel(activity.config.presentation.mode)}
                </div>

                <div>
                  <strong>محور x:</strong> {activity.config.dataset.x.label} (
                  {activity.config.dataset.x.unit}) = {activity.config.dataset.x.values.join('، ')}
                </div>

                <div>
                  <strong>السلاسل:</strong>

                  <ul>
                    {activity.config.dataset.series.map((series) => (
                      <li key={series.id}>
                        {series.label} ({series.unit}) = {series.values.join('، ')}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong>المهام:</strong>

                  <ol>
                    {activity.config.tasks.map((task) => (
                      <li key={task.id}>
                        {task.prompt} [{dataTaskRuleLabel(task)}]
                        {task.tolerance === undefined ? '' : `، هامش السماح: ${task.tolerance}`}
                      </li>
                    ))}
                  </ol>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
