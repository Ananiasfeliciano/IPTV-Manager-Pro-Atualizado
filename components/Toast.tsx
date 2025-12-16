import React, { useEffect } from 'react';
import { Icon } from './Icon';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const baseClasses = "fixed bottom-5 right-5 flex items-center p-4 rounded-lg shadow-lg text-white max-w-sm z-50 animate-fadeInUp";
  const typeClasses = {
    success: "bg-green-600/90 backdrop-blur-sm border border-green-500",
    error: "bg-red-600/90 backdrop-blur-sm border border-red-500",
  };
  const iconName = type === 'success' ? 'check-circle' : 'exclamation-triangle';

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`} role="alert">
      <Icon name={iconName} className="w-6 h-6 mr-3" />
      <div className="flex-grow">{message}</div>
      <button onClick={onClose} className="ml-4 -mr-2 p-1.5 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
        <Icon name="x-mark" className="w-5 h-5" />
      </button>
    </div>
  );
};