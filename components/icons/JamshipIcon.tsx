
import React from 'react';

const JamshipIcon: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
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
    <path d="M12 12v-2" />
    <path d="M15.05 15.05A7 7 0 1 0 8.95 8.95" />
    <path d="M12 12l-2 4h4l-2-4z" />
    <path d="M17.66 17.66l-1.41 1.41" />
    <path d="M6.34 6.34l-1.41 1.41" />
  </svg>
);

export default JamshipIcon;