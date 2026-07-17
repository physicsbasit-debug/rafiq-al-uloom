/**
 * Phase 1-H1
 * Design Tokens Foundation
 *
 * Pure spacing scale.
 * Mirrors CSS @theme custom properties defined in src/index.css.
 * Uses the same xs→3xl naming convention adopted across all token files.
 * Pure data only. No React, JSX, imports, logic or runtime behavior.
 */

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '3rem',
} as const;

export type SpacingTokens = typeof spacing;
