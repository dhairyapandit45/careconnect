/**
 * Reusable Button Component
 */

import React from 'react';

const variants = {
  primary: 'bg-forest hover:bg-forest-deep text-white focus:ring-forest shadow-xs active:bg-forest-deep',
  secondary: 'bg-darkgreen hover:bg-[#173025] text-white focus:ring-darkgreen shadow-xs',
  outline: 'border border-themeborder bg-white text-darkgreen hover:bg-ivory focus:ring-forest',
  danger: 'bg-status-error hover:bg-[#911b12] text-white focus:ring-status-error shadow-xs',
  ghost: 'text-darkgreen-muted hover:bg-palesage hover:text-darkgreen focus:ring-sage',
};

const sizes = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export const Button = React.forwardRef(
  (
    {
      children,
      type = 'button',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      fullWidth = false,
      className = '',
      icon: Icon,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          variants[variant] || variants.primary
        } ${sizes[size] || sizes.md} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {Icon && <Icon className={`h-4 w-4 ${children ? 'mr-2' : ''}`} />}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
