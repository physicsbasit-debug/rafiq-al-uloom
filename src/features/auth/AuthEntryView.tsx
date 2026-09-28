import './auth-portal.css';
import { SignInForm } from './SignInForm';
import type { AuthSessionContextValue } from './useAuthSession';

interface AuthEntryViewProps {
  readonly session: Pick<
    AuthSessionContextValue,
    'entryMode' | 'confirmationEmail' | 'signIn' | 'openSignIn' | 'closeAuthEntry'
  >;
  readonly onStartLearning: () => void;
}

function ScienceEmblem() {
  return (
    <div className="rafiq-auth-emblem" aria-hidden="true">
      <svg viewBox="0 0 120 120" role="img">
        <circle cx="60" cy="60" r="7" fill="currentColor" />
        <ellipse
          cx="60"
          cy="60"
          rx="38"
          ry="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
        />
        <ellipse
          cx="60"
          cy="60"
          rx="38"
          ry="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          transform="rotate(60 60 60)"
        />
        <ellipse
          cx="60"
          cy="60"
          rx="38"
          ry="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          transform="rotate(120 60 60)"
        />
      </svg>
    </div>
  );
}

export function AuthEntryView({ session, onStartLearning }: AuthEntryViewProps) {
  const showStaffSignIn = session.entryMode === 'sign_in' || session.entryMode === 'sign_up';
  const showStudentPortal = session.entryMode === 'closed';

  return (
    <main className="rafiq-auth-page">
      <section className="rafiq-auth-card" aria-label="بوابة رفيق العلوم">
        <div className="rafiq-auth-brand-panel">
          <ScienceEmblem />
          <h1>رفيق العلوم</h1>
          <p className="rafiq-auth-scope">الفيزياء • الصفان التاسع والعاشر</p>
          <p className="rafiq-auth-portal-label">بوابة الدخول</p>

          <div className="rafiq-auth-wave" aria-hidden="true">
            <svg viewBox="0 0 720 44" preserveAspectRatio="none">
              <path
                d="M0 14C90 40 180 0 270 18S450 40 540 16 675 6 720 20V44H0Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        <div className="rafiq-auth-form-shell">
          {showStudentPortal ? (
            <section className="rafiq-student-entry" aria-labelledby="student-entry-title">
              <h2 id="student-entry-title">ابدأ تعلّم الفيزياء</h2>
              <p>لا يحتاج الطالب إلى حساب أو بريد إلكتروني. اختر صفك وابدأ التعلّم مباشرة.</p>

              <div className="rafiq-auth-actions">
                <button
                  type="button"
                  onClick={onStartLearning}
                  className="rafiq-auth-button rafiq-auth-button-primary rafiq-start-learning"
                >
                  ابدأ التعلّم
                </button>

                <button
                  type="button"
                  onClick={session.openSignIn}
                  className="rafiq-auth-button rafiq-auth-button-staff"
                >
                  دخول الكادر التعليمي
                </button>
              </div>
            </section>
          ) : null}

          {showStaffSignIn ? (
            <section aria-label="دخول الكادر التعليمي">
              <p className="rafiq-staff-eyebrow">للمعلم والمراجع فقط</p>
              <SignInForm
                onSubmit={session.signIn}
                onCreateAccount={() => undefined}
                onCancel={session.closeAuthEntry}
                showCreateAccount={false}
                cancelLabel="العودة إلى بوابة الطالب"
              />
            </section>
          ) : null}

          {session.entryMode === 'confirmation_required' ? (
            <div role="status" aria-live="polite" className="rafiq-auth-confirmation">
              <h2>راجع بريدك الإلكتروني</h2>
              <p>
                أرسلنا تعليمات تأكيد الحساب إلى البريد المدخل. أكمل التأكيد ثم عد إلى تسجيل الدخول.
              </p>
              {session.confirmationEmail ? (
                <p dir="ltr" className="rafiq-auth-confirmation-email">
                  {session.confirmationEmail}
                </p>
              ) : null}
              <button
                type="button"
                onClick={session.openSignIn}
                className="rafiq-auth-button rafiq-auth-button-primary"
              >
                العودة إلى تسجيل الدخول
              </button>
            </div>
          ) : null}
        </div>

        <div className="rafiq-auth-credit">
          <span>رفيق العلوم</span>
          <span>فكرة وتطوير: أ. محمود اليحيائي • أ. وليد الهنائي</span>
          <span className="rafiq-auth-copyright">© 2026</span>
        </div>

        <p className="rafiq-auth-access-note">
          الطالب يتعلّم مباشرة دون إنشاء حساب. الحساب مخصص للكادر التعليمي فقط.
        </p>
      </section>
    </main>
  );
}
