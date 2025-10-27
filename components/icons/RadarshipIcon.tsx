import React from 'react';

const RadarshipIcon: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
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
    <path d="M12 12 L12 12" />
    <path d="M19.071067811865476 4.928932188134524 A9 9 0 0 1 19.071067811865476 19.071067811865476" />
    <path d="M15.535533905932738 8.464466094067262 A5 5 0 0 1 15.535533905932738 15.535533905932738" />
    <path d="M12 4 L12 2" />
  </svg>
);

export default RadarshipIcon;