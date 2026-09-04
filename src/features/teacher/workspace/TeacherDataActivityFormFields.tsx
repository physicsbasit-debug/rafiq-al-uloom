import type {
  TeacherDataActivityForm,
  TeacherDataSeriesForm,
  TeacherDataTaskForm,
  TeacherDataTaskKind,
} from './teacher-data-activity-form';

interface TeacherDataActivityFormFieldsProps {
  readonly form: TeacherDataActivityForm;
  readonly disabled: boolean;
  readonly onChange: (form: TeacherDataActivityForm) => void;
}

function replaceSeries(
  items: readonly TeacherDataSeriesForm[],
  id: string,
  update: TeacherDataSeriesForm
): readonly TeacherDataSeriesForm[] {
  return items.map((item) => (item.id === id ? update : item));
}

function replaceTask(
  items: readonly TeacherDataTaskForm[],
  id: string,
  update: TeacherDataTaskForm
): readonly TeacherDataTaskForm[] {
  return items.map((item) => (item.id === id ? update : item));
}

export function TeacherDataActivityFormFields({
  form,
  disabled,
  onChange,
}: TeacherDataActivityFormFieldsProps) {
  const updateSeries = (item: TeacherDataSeriesForm, update: Partial<TeacherDataSeriesForm>) => {
    onChange({
      ...form,
      series: replaceSeries(form.series, item.id, {
        ...item,
        ...update,
      }),
    });
  };

  const removeSeries = (id: string) => {
    onChange({
      ...form,
      series: form.series.filter((item) => item.id !== id),
    });
  };

  const updateTask = (item: TeacherDataTaskForm, update: Partial<TeacherDataTaskForm>) => {
    onChange({
      ...form,
      tasks: replaceTask(form.tasks, item.id, {
        ...item,
        ...update,
      }),
    });
  };

  const removeTask = (id: string) => {
    onChange({
      ...form,
      tasks: form.tasks.filter((item) => item.id !== id),
    });
  };

  const changeTaskKind = (task: TeacherDataTaskForm, kind: TeacherDataTaskKind) => {
    updateTask(task, { kind });
  };

  return (
    <>
      <label className="teacher-field">
        <span className="teacher-field-label">السياق العلمي</span>

        <textarea
          aria-label="سياق نشاط البيانات"
          value={form.context}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...form,
              context: event.target.value,
            })
          }
        />
      </label>

      <div className="teacher-question-form-grid">
        <label className="teacher-field">
          <span className="teacher-field-label">طريقة العرض</span>

          <select
            aria-label="طريقة عرض البيانات"
            value={form.presentationMode}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...form,
                presentationMode: event.target.value as TeacherDataActivityForm['presentationMode'],
              })
            }
          >
            <option value="table">جدول</option>

            <option value="line_graph">رسم خطي</option>

            <option value="table_and_line_graph">جدول ورسم خطي</option>
          </select>
        </label>

        <label className="teacher-field">
          <span className="teacher-field-label">تسمية محور x</span>

          <input
            aria-label="تسمية محور x"
            value={form.xAxisLabel}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...form,
                xAxisLabel: event.target.value,
              })
            }
          />
        </label>

        <label className="teacher-field">
          <span className="teacher-field-label">تسمية محور y</span>

          <input
            aria-label="تسمية محور y"
            value={form.yAxisLabel}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...form,
                yAxisLabel: event.target.value,
              })
            }
          />
        </label>
      </div>

      <fieldset className="teacher-choice-fieldset">
        <legend>بيانات المحور الأفقي</legend>

        <div className="teacher-question-form-grid">
          <label className="teacher-field">
            <span className="teacher-field-label">اسم المتغير</span>

            <input
              aria-label="اسم متغير المحور x"
              value={form.xLabel}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...form,
                  xLabel: event.target.value,
                })
              }
            />
          </label>

          <label className="teacher-field">
            <span className="teacher-field-label">الوحدة</span>

            <input
              aria-label="وحدة المحور x"
              value={form.xUnit}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...form,
                  xUnit: event.target.value,
                })
              }
            />
          </label>
        </div>

        <label className="teacher-field">
          <span className="teacher-field-label">قيم x</span>

          <span className="teacher-field-hint">
            أدخل القيم بالترتيب التصاعدي، مفصولة بأسطر أو فواصل.
          </span>

          <textarea
            aria-label="قيم المحور x"
            value={form.xValuesText}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...form,
                xValuesText: event.target.value,
              })
            }
          />
        </label>
      </fieldset>

      <fieldset className="teacher-choice-fieldset">
        <legend>السلاسل الرقمية</legend>

        {form.series.length === 0 ? (
          <div className="teacher-empty-state">أضف سلسلة بيانات واحدة على الأقل.</div>
        ) : (
          <div className="teacher-item-list">
            {form.series.map((series, index) => (
              <div key={series.id} className="teacher-item-card">
                <div className="teacher-item-card-main">
                  <span className="teacher-item-number" aria-hidden="true">
                    {index + 1}
                  </span>

                  <div>
                    <strong className="teacher-item-title">السلسلة {index + 1}</strong>

                    <p>{series.id}</p>
                  </div>
                </div>

                <div className="teacher-question-form-grid">
                  <label className="teacher-field">
                    <span className="teacher-field-label">اسم السلسلة</span>

                    <input
                      aria-label={`اسم السلسلة ${index + 1}`}
                      value={series.label}
                      disabled={disabled}
                      onChange={(event) =>
                        updateSeries(series, {
                          label: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="teacher-field">
                    <span className="teacher-field-label">وحدة السلسلة</span>

                    <input
                      aria-label={`وحدة السلسلة ${index + 1}`}
                      value={series.unit}
                      disabled={disabled}
                      onChange={(event) =>
                        updateSeries(series, {
                          unit: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <label className="teacher-field">
                  <span className="teacher-field-label">قيم السلسلة</span>

                  <textarea
                    aria-label={`قيم السلسلة ${index + 1}`}
                    value={series.valuesText}
                    disabled={disabled}
                    onChange={(event) =>
                      updateSeries(series, {
                        valuesText: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="teacher-inline-actions">
                  <button
                    type="button"
                    className="teacher-inline-action teacher-inline-action--danger"
                    aria-label={`حذف السلسلة ${index + 1}`}
                    disabled={disabled}
                    onClick={() => removeSeries(series.id)}
                  >
                    حذف السلسلة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="teacher-choice-fieldset">
        <legend>مهام قراءة البيانات</legend>

        {form.tasks.length === 0 ? (
          <div className="teacher-empty-state">أضف مهمة واحدة على الأقل.</div>
        ) : (
          <div className="teacher-item-list">
            {form.tasks.map((task, index) => (
              <div key={task.id} className="teacher-item-card">
                <div className="teacher-item-card-main">
                  <span className="teacher-item-number" aria-hidden="true">
                    {index + 1}
                  </span>

                  <div>
                    <strong className="teacher-item-title">المهمة {index + 1}</strong>

                    <p>{task.id}</p>
                  </div>
                </div>

                <div className="teacher-question-form-grid">
                  <label className="teacher-field">
                    <span className="teacher-field-label">نوع المهمة</span>

                    <select
                      aria-label={`نوع المهمة ${index + 1}`}
                      value={task.kind}
                      disabled={disabled}
                      onChange={(event) =>
                        changeTaskKind(task, event.target.value as TeacherDataTaskKind)
                      }
                    >
                      <option value="read_value">قراءة قيمة</option>

                      <option value="difference">إيجاد الفرق</option>

                      <option value="mean">حساب المتوسط</option>
                    </select>
                  </label>

                  <label className="teacher-field">
                    <span className="teacher-field-label">السلسلة</span>

                    <select
                      aria-label={`سلسلة المهمة ${index + 1}`}
                      value={task.seriesId}
                      disabled={disabled}
                      onChange={(event) =>
                        updateTask(task, {
                          seriesId: event.target.value,
                        })
                      }
                    >
                      <option value="">اختر سلسلة</option>

                      {form.series.map((series) => (
                        <option key={series.id} value={series.id}>
                          {series.label || series.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="teacher-field">
                  <span className="teacher-field-label">نص المهمة</span>

                  <textarea
                    aria-label={`نص المهمة ${index + 1}`}
                    value={task.prompt}
                    disabled={disabled}
                    onChange={(event) =>
                      updateTask(task, {
                        prompt: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="teacher-question-form-grid">
                  <label className="teacher-field">
                    <span className="teacher-field-label">وحدة الإجابة</span>

                    <input
                      aria-label={`وحدة المهمة ${index + 1}`}
                      value={task.unit}
                      disabled={disabled}
                      onChange={(event) =>
                        updateTask(task, {
                          unit: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="teacher-field">
                    <span className="teacher-field-label">هامش السماح</span>

                    <input
                      aria-label={`هامش سماح المهمة ${index + 1}`}
                      inputMode="decimal"
                      value={task.toleranceText}
                      disabled={disabled}
                      onChange={(event) =>
                        updateTask(task, {
                          toleranceText: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                {task.kind === 'read_value' ? (
                  <label className="teacher-field">
                    <span className="teacher-field-label">فهرس النقطة</span>

                    <input
                      aria-label={`فهرس قراءة المهمة ${index + 1}`}
                      inputMode="numeric"
                      value={task.pointIndexText}
                      disabled={disabled}
                      onChange={(event) =>
                        updateTask(task, {
                          pointIndexText: event.target.value,
                        })
                      }
                    />
                  </label>
                ) : null}

                {task.kind === 'difference' ? (
                  <div className="teacher-question-form-grid">
                    <label className="teacher-field">
                      <span className="teacher-field-label">الفهرس الأول</span>

                      <input
                        aria-label={`الفهرس الأول للمهمة ${index + 1}`}
                        inputMode="numeric"
                        value={task.leftIndexText}
                        disabled={disabled}
                        onChange={(event) =>
                          updateTask(task, {
                            leftIndexText: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="teacher-field">
                      <span className="teacher-field-label">الفهرس الثاني</span>

                      <input
                        aria-label={`الفهرس الثاني للمهمة ${index + 1}`}
                        inputMode="numeric"
                        value={task.rightIndexText}
                        disabled={disabled}
                        onChange={(event) =>
                          updateTask(task, {
                            rightIndexText: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="teacher-field">
                      <span className="teacher-field-label">الفرق المطلق</span>

                      <input
                        aria-label={`الفرق المطلق للمهمة ${index + 1}`}
                        type="checkbox"
                        checked={task.absolute}
                        disabled={disabled}
                        onChange={(event) =>
                          updateTask(task, {
                            absolute: event.target.checked,
                          })
                        }
                      />
                    </label>
                  </div>
                ) : null}

                {task.kind === 'mean' ? (
                  <label className="teacher-field">
                    <span className="teacher-field-label">فهارس نقاط المتوسط</span>

                    <input
                      aria-label={`فهارس المتوسط للمهمة ${index + 1}`}
                      value={task.pointIndicesText}
                      disabled={disabled}
                      onChange={(event) =>
                        updateTask(task, {
                          pointIndicesText: event.target.value,
                        })
                      }
                    />
                  </label>
                ) : null}

                <div className="teacher-inline-actions">
                  <button
                    type="button"
                    className="teacher-inline-action teacher-inline-action--danger"
                    aria-label={`حذف المهمة ${index + 1}`}
                    disabled={disabled}
                    onClick={() => removeTask(task.id)}
                  >
                    حذف المهمة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>
    </>
  );
}
