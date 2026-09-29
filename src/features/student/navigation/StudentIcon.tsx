import type { SVGProps } from 'react';

export type StudentIconName =
  | 'grade'
  | 'semester'
  | 'physics'
  | 'unit'
  | 'lesson'
  | 'check'
  | 'route'
  | 'chevron-left'
  | 'chevron-down'
  | 'chevron-right'
  | 'home'
  | 'review'
  | 'activities'
  | 'game'
  | 'lab'
  | 'mastery'
  | 'experiment'
  | 'simulation'
  | 'inquiry'
  | 'data';

interface StudentIconProps extends SVGProps<SVGSVGElement> {
  readonly name: StudentIconName;
}

export function StudentIcon({ name, ...props }: StudentIconProps) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...props,
  };

  if (name === 'grade') {
    return (
      <svg {...common}>
        <path d="M3 9.2 12 4l9 5.2-9 5.2L3 9.2Z" />
        <path d="M6.5 11.3v4.1c2.8 2.1 8.2 2.1 11 0v-4.1" />
        <path d="M21 9.2v5" />
      </svg>
    );
  }

  if (name === 'semester') {
    return (
      <svg {...common}>
        <rect x="3.5" y="5.2" width="17" height="15" rx="2.3" />
        <path d="M7.3 3.5v3.4M16.7 3.5v3.4M3.5 9h17" />
        <path d="M7.5 13h3M13.5 13h3M7.5 16.4h3" />
      </svg>
    );
  }

  if (name === 'physics') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
        <ellipse cx="12" cy="12" rx="8.8" ry="3.6" />
        <ellipse cx="12" cy="12" rx="8.8" ry="3.6" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="8.8" ry="3.6" transform="rotate(120 12 12)" />
      </svg>
    );
  }

  if (name === 'unit') {
    return (
      <svg {...common}>
        <path d="m12 3 8.4 4.5L12 12 3.6 7.5 12 3Z" />
        <path d="m4.2 11.2 7.8 4.2 7.8-4.2M4.2 15.2l7.8 4.2 7.8-4.2" />
      </svg>
    );
  }

  if (name === 'lesson') {
    return (
      <svg {...common}>
        <path d="M4 5.4c2.8-.8 5.3-.3 8 1.1v13c-2.7-1.4-5.2-1.9-8-1.1v-13Z" />
        <path d="M20 5.4c-2.8-.8-5.3-.3-8 1.1v13c2.7-1.4 5.2-1.9 8-1.1v-13Z" />
      </svg>
    );
  }

  if (name === 'check') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12.2 2.5 2.5 5.7-6" />
      </svg>
    );
  }

  if (name === 'chevron-left') {
    return (
      <svg {...common}>
        <path d="m14.5 6-6 6 6 6" />
      </svg>
    );
  }

  if (name === 'chevron-down') {
    return (
      <svg {...common}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    );
  }

  if (name === 'chevron-right') {
    return (
      <svg {...common}>
        <path d="m9.5 6 6 6-6 6" />
      </svg>
    );
  }

  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="m3.5 10.5 8.5-7 8.5 7" />
        <path d="M5.8 9.2V20h12.4V9.2M9.5 20v-6h5v6" />
      </svg>
    );
  }

  if (name === 'review') {
    return (
      <svg {...common}>
        <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v10.5H7A2 2 0 0 1 5 15.5v-11Z" />
        <path d="M8.2 9h6.2M8.2 12h5M16.5 16.5l2.8 2.8" />
        <circle cx="15.2" cy="15.2" r="2.7" />
      </svg>
    );
  }

  if (name === 'activities') {
    return (
      <svg {...common}>
        <path d="M9 3v5.2L4.8 16a3.3 3.3 0 0 0 2.9 5h8.6a3.3 3.3 0 0 0 2.9-5L15 8.2V3" />
        <path d="M7.8 13h8.4M8.5 3h7" />
      </svg>
    );
  }

  if (name === 'game') {
    return (
      <svg {...common}>
        <path d="M7.4 8.2h9.2a4 4 0 0 1 3.7 5.5l-1.1 2.7a2.5 2.5 0 0 1-4.1.8L13.7 16h-3.4l-1.4 1.2a2.5 2.5 0 0 1-4.1-.8l-1.1-2.7a4 4 0 0 1 3.7-5.5Z" />
        <path d="M8 11v4M6 13h4M16.8 11.7h.01M18.4 14h.01" />
      </svg>
    );
  }

  if (name === 'lab' || name === 'experiment') {
    return (
      <svg {...common}>
        <path d="M9 3v5.2L4.6 17a2.8 2.8 0 0 0 2.5 4h9.8a2.8 2.8 0 0 0 2.5-4L15 8.2V3" />
        <path d="M7.8 13h8.4M8 3h8" />
        <circle cx="10" cy="16" r=".7" fill="currentColor" stroke="none" />
        <circle cx="14.3" cy="17.3" r=".7" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === 'mastery') {
    return (
      <svg {...common}>
        <path d="M12 3 4.8 6.2v5.2c0 4.4 2.7 7.7 7.2 9.6 4.5-1.9 7.2-5.2 7.2-9.6V6.2L12 3Z" />
        <path d="m8.5 12 2.2 2.2 4.7-5" />
      </svg>
    );
  }

  if (name === 'simulation') {
    return (
      <svg {...common}>
        <path d="M4 14c2.2-6 4.3-6 6.4 0s4.2 6 6.4 0S19 8 20 10" />
        <path d="M4 4v16M20 4v16" />
      </svg>
    );
  }

  if (name === 'inquiry') {
    return (
      <svg {...common}>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m14.6 14.6 4.4 4.4M10.5 7.8v.1M8.8 10.6c.2-1 1-1.6 1.8-1.6 1 0 1.8.7 1.8 1.6 0 .8-.5 1.2-1.2 1.7-.5.3-.7.7-.7 1.2" />
      </svg>
    );
  }

  if (name === 'data') {
    return (
      <svg {...common}>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
        <path d="M3 19h19" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="6" cy="17.5" r="2.2" />
      <circle cx="18" cy="6.5" r="2.2" />
      <path d="M8.2 17.1c4.8-.5 2.7-7.3 7.6-9.8" />
      <path d="m13.8 7.4 2.1-.1-.1 2.1" />
    </svg>
  );
}
