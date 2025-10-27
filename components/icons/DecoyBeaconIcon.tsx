
import React from 'react';

const DecoyBeaconIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2L2 12l10 10 10-10L12 2z" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export default DecoyBeaconIcon;
