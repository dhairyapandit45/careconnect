/**
 * Reusable Input Component
 */

import React from 'react';

export const Input = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      id,
      name,
      type = 'text',
      className = '',
      icon: Icon,
      required = false,
      ...props
    },
    ref
  ) => {
    const inputId = id || name;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-darkgreen mb-1">
            {label}
            {required && <span className="text-status-error ml-1">*</span>}
          </label>
        )}
        <div className="relative rounded-md shadow-xs">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-darkgreen-muted">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            className={`block w-full rounded-lg border text-sm transition-colors bg-white focus:outline-none focus:ring-2 ${
              Icon ? 'pl-10' : 'pl-3'
            } pr-3 py-2 ${
              error
                ? 'border-status-error/60 text-status-error focus:border-status-error focus:ring-status-error/20'
                : 'border-themeborder text-darkgreen focus:border-forest focus:ring-sage/40'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-status-error font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-darkgreen-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
