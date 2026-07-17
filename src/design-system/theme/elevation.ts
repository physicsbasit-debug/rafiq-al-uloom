/**
 * Phase 1-H1
 * Design Tokens Foundation
 *
 * Pure elevation scale.
 * Mirrors CSS @theme custom properties defined in src/index.css.
 * This file contains geometry only.
 * It does not define colors, rgba values, hex values, or CSS var references.
 * Focus color composition is performed exclusively inside src/index.css.
 * Pure data only. No React, JSX, imports, logic, functions, or runtime behavior.
 */

export const elevation = {
  xs: '0 1px 2px',
  sm: '0 2px 4px',
  md: '0 4px 8px',
  lg: '0 8px 16px',
  xl: '0 12px 24px',
  '2xl': '0 16px 32px',
  '3xl': '0 24px 48px',
  focusRingWidth: '3px',
} as const;

export type ElevationTokens = typeof elevation;
