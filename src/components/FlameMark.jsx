import React from 'react';

// Priority indicator used throughout the app — filled proportionally
// to urgency rather than a plain colored dot, tying back to the
// POPCRU torch mark. Keep this the single source of truth for
// priority colors so a case's priority always looks the same
// wherever it's shown.
export const PRIORITY_STYLE = {
  critical: { color: '#C4321F', label: 'Critical', fill: 1 },
  high:     { color: '#C4321F', label: 'High',     fill: 0.75 },
  medium:   { color: '#E8B32D', label: 'Medium',   fill: 0.5 },
  low:      { color: '#6B655C', label: 'Low',      fill: 0.25 },
};

export default function FlameMark({ priority, size = 16 }) {
  const p = PRIORITY_STYLE[priority?.toLowerCase()] || PRIORITY_STYLE.low;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" role="img" aria-label={`${p.label} priority`}>
      <title>{p.label} priority</title>
      <path
        d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1.5-1-2.5-1.5-3.5.8.3 3.5 2 3.5 6.5a8 8 0 1 1-16 0C4 7 8 5 12 2Z"
        fill={p.color}
        fillOpacity={0.15 + p.fill * 0.55}
        stroke={p.color}
        strokeWidth="1.4"
      />
    </svg>
  );
}
