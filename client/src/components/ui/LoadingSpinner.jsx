/**
 * Reusable Loading Spinner Component
 */

import React from 'react';

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-3',
  lg: 'h-12 w-12 border-4',
};

export const LoadingSpinner = ({ size = 'md', className = '', label = 'Loading content...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-3" role="status">
      <div
        className={`animate-spin rounded-full border-blue-600 border-t-transparent ${sizeMap[size] || sizeMap.md} ${className}`}
      />
      {label && <span className="text-xs text-slate-500 font-medium">{label}</span>}
      <span className="sr-only">Loading</span>
    </div>
  );
};

export default LoadingSpinner;
