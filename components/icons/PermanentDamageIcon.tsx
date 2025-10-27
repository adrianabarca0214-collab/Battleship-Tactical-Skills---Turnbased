import React from 'react';

const PermanentDamageIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    {/* Base Explosion */}
    <path d="M20.94 13.06a9 9 0 1 1-1.88-5.63" />
    <path d="M11.96 15.53a2.5 2.5 0 0 1-3.49-3.49" />
    <path d="M16.5 7.5L14 10" />
    <path d="M19.07 10.93L16 14" />
    <path d="m13.06 20.94-2.12-2.12" />
    <path d="M4.93 19.07 10 14" />
    <path d="m7.5 16.5 2.5-2.5" />
    <path d="M10.93 4.93 14 10" />
    <path d="M14 2v3.5" />
    <path d="M22 10h-3.5" />
    <path d="M10 22v-3.5" />
    <path d="M2 10h3.5" />
    {/* Crack lines */}
    <path d="M9.5 9.5l-2 3" strokeWidth="2.5" />
    <path d="M14.5 14.5l2 -3" strokeWidth="2.5" />
  </svg>
);

export default PermanentDamageIcon;
