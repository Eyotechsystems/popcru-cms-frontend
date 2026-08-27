import React from 'react';

export const STATUS_LABEL = {
  new: 'New',
  ongoing: 'Ongoing',
  resolved: 'Resolved',
  referred_external: 'Referred',
  withdrawn: 'Withdrawn',
};

export const STATUS_COLOR = {
  new: '#C4321F',
  ongoing: '#E8B32D',
  resolved: '#4B7A51',
  referred_external: '#6B655C',
  withdrawn: '#6B655C',
};

export default function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || '#6B655C';
  const label = STATUS_LABEL[status] || status;
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: `${color}1A`, color }}
    >
      {label}
    </span>
  );
}
