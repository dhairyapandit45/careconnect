/**
 * Reusable Badge Component
 */

import React from 'react';

const badgeVariants = {
  default: 'bg-ivory text-darkgreen-muted border-themeborder',
  primary: 'bg-palesage text-forest-deep border-sage',
  success: 'bg-[#EAF5EE] text-emerald-700 border-[#BCE2C9]',
  warning: 'bg-[#FEF3C7] text-status-warning border-[#FDE68A]',
  danger: 'bg-[#FEE4E2] text-status-error border-[#FECDCA]',
  info: 'bg-[#E0F2FE] text-status-info border-[#BAE6FD]',
  purple: 'bg-[#F3E8FF] text-purple-700 border-purple-200',
  indigo: 'bg-palesage text-forest-deep border-sage',
  secondary: 'bg-ivory text-darkgreen border-themeborder',
  outline: 'bg-white text-darkgreen border-themeborder',
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
