import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import type { MasteryClassification } from '@shared-types/mastery.types';

interface MasteryBadgeProps {
  classification: MasteryClassification;
}

export function MasteryBadge({ classification }: MasteryBadgeProps) {
  const style =
    classification === 'متقن'
      ? { background: colors.successSoft, foreground: colors.successDark }
      : classification === 'قريب من الإتقان'
        ? { background: colors.warningSoft, foreground: colors.warning }
        : { background: colors.errorSoft, foreground: colors.errorDark };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: '36px',
        border: `1px solid ${style.foreground}`,
        borderRadius: radius.pill,
        backgroundColor: style.background,
        color: style.foreground,
        padding: `${spacing.xs} ${spacing.md}`,
        fontWeight: 900,
      }}
    >
      {classification}
    </span>
  );
}
