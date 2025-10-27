import React from 'react';

const ShipIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 20.24c0-1.25.95-2.24 2.1-2.24h15.8c1.15 0 2.1.99 2.1 2.24" />
    <path d="M4 18V7.5c0-1.38 1.12-2.5 2.5-2.5h11c1.38 0 2.5 1.12 2.5 2.5V18" />
    <path d="M8 14h8" />
    <path d="M10 10h4" />
    <path d="M12 5V2" />
  </svg>
);

export default ShipIcon;
