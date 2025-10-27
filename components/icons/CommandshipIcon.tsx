import React from 'react';

const CommandshipIcon: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
    <path d="M12 4v-2"/>
    <path d="M6 6l-2-2"/>
    <path d="M18 6l2-2"/>
  </svg>
);

export default CommandshipIcon;