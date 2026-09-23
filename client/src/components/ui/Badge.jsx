/**
 * Reusable Badge Component
 */

import React from 'react';

const badgeVariants = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

export const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${badgeVariants[variant] || badgeVariants.default} ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
