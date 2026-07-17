/**
 * Phase 1-H1
 * Design Tokens Foundation
 *
 * Decision:
 * - Replaces the historical "base" token with "md" to unify the sizing scale
 *   across all design token groups (typography, spacing, radius, elevation).
 * - Mirrors CSS @theme custom properties defined in src/index.css.
 * - Pure data only. No React, JSX, hooks, logic, or imports.
 */

export const typography = {
  fontFamily: {
    primary: '"Tajawal", "IBM Plex Sans Arabic", sans-serif',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  lineHeight: {
    xs: '1.2',
    sm: '1.35',
    md: '1.5',
    lg: '1.65',
    xl: '1.8',
    '2xl': '2',
    '3xl': '2.2',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export type TypographyTokens = typeof typography;
