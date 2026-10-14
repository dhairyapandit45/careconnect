/**
 * Reusable Card Component
 */

import React from 'react';

export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-themeborder shadow-xs overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, children, className = '' }) => {
  return (
    <div className={`p-5 border-b border-themeborder/60 flex items-center justify-between ${className}`}>
      {children || (
        <>
          <div>
            {title && <h3 className="text-base font-semibold text-darkgreen">{title}</h3>}
            {subtitle && <p className="text-xs text-darkgreen-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </>
      )}
    </div>
  );
};

export const CardContent = ({ children, className = '' }) => {
  return <div className={`p-5 ${className}`}>{children}</div>;
};

export const CardFooter = ({ children, className = '' }) => {
  return (
    <div className={`p-4 bg-ivory/60 border-t border-themeborder/60 flex items-center justify-end ${className}`}>
      {children}
    </div>
  );
};

export default Card;
