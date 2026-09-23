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
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          name={name}
          className={`block w-full rounded-lg border text-sm transition-colors px-3 py-2 bg-white focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-blue-200'
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
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
