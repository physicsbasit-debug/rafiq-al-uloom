import { StudentIcon } from './StudentIcon';

interface StudentBackActionProps {
  readonly label: string;
  readonly onClick: () => void;
  readonly kind?: 'back' | 'home';
  readonly wide?: boolean;
}

export function StudentBackAction({
  label,
  onClick,
  kind = 'back',
  wide = false,
}: StudentBackActionProps) {
  return (
    <button
      type="button"
      className={`rafiq-student-back-action${wide ? ' is-wide' : ''}`}
      onClick={onClick}
    >
      <span className="rafiq-student-back-icon" aria-hidden="true">
        <StudentIcon name={kind === 'home' ? 'home' : 'chevron-right'} width="21" height="21" />
      </span>
      <span>{label}</span>
    </button>
  );
}
