/**
 * Reusable Select Component
 */

import React from 'react';

export const Select = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      id,
      name,
      options = [],
      children,
      className = '',
      required = false,
      ...props
    },
    ref
  ) => {
    const selectId = id || name;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-darkgreen mb-1">
            {label}
            {required && <span className="text-status-error ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          name={name}
          className={`block w-full rounded-lg border text-sm transition-colors px-3 py-2 bg-white focus:outline-none focus:ring-2 ${
            error
              ? 'border-status-error/60 text-status-error focus:border-status-error focus:ring-status-error/20'
              : 'border-themeborder text-darkgreen focus:border-forest focus:ring-sage/40'
          } ${className}`}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="mt-1 text-xs text-status-error font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-darkgreen-muted">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
