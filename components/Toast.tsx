import React, { useEffect } from 'react';
import InfoIcon from './icons/InfoIcon';
import XIcon from './icons/XIcon';

interface ToastProps {
  message: string;
  type: 'error' | 'info' | 'success';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const baseClasses = "fixed top-5 right-5 z-50 flex items-center p-4 max-w-sm w-full rounded-lg shadow-lg text-white transition-opacity duration-300";
  const typeClasses = {
    error: 'bg-red-800 border-red-600',
    info: 'bg-blue-800 border-blue-600',
    success: 'bg-green-800 border-green-600',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]} border-2 fade-in`} role="alert">
      <div className="flex-shrink-0">
         <InfoIcon className="w-6 h-6" />
      </div>
      <div className="ml-3 text-sm font-medium">
        {message}
      </div>
      <button
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg inline-flex h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10 focus:ring-2 focus:ring-slate-400"
        onClick={onClose}
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;
