import React from 'react';

const DecoyshipIcon: React.FC<{ className?: string, style?: React.CSSProperties }> = ({ className, style }) => (
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
    <path d="M5.5 13.5A3.5 3.5 0 0 1 2 10V8c0-2.2 1.8-4 4-4h8c2.2 0 4 1.8 4 4v2a3.5 3.5 0 0 1-3.5 3.5h-1.1"/>
    <path d="M12 16l-1.5 2.5L12 21l1.5-2.5L12 16Z"/>
    <path d="M8 16l-1.5 2.5L8 21l1.5-2.5L8 16Z"/>
    <path d="M16 16l-1.5 2.5L16 21l1.5-2.5L16 16Z"/>
    <circle cx="9" cy="10" r=".5" fill="currentColor"></circle>
    <circle cx="15" cy="10" r=".5" fill="currentColor"></circle>
  </svg>
);

export default DecoyshipIcon;