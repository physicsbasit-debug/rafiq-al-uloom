/**
 * Phase 1-H1
 * Design Tokens Foundation
 *
 * Pure radius scale.
 * Mirrors CSS @theme custom properties defined in src/index.css.
 * Uses the same xs→3xl naming convention adopted across all design tokens.
 *
 * NOTE:
 * pill intentionally remains a named semantic token because it represents
 * a visual shape rather than a size progression.
 *
 * Pure data only. No React, JSX, imports, logic or runtime behavior.
 */

export const radius = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  pill: '999px',
} as const;

export type RadiusTokens = typeof radius;
