/**
 * Reusable Table Components
 */

import React from 'react';

export const Table = ({ children, className = '' }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-left border-collapse text-sm ${className}`}>{children}</table>
    </div>
  );
};

export const TableHeader = ({ children, className = '' }) => {
  return <thead className={`border-b border-themeborder bg-ivory/80 ${className}`}>{children}</thead>;
};

export const TableBody = ({ children, className = '' }) => {
  return <tbody className={`divide-y divide-themeborder/60 ${className}`}>{children}</tbody>;
};

export const TableRow = ({ children, className = '', hover = true }) => {
  return (
    <tr className={`transition-colors ${hover ? 'hover:bg-ivory/60' : ''} ${className}`}>
      {children}
    </tr>
  );
};

export const TableHead = ({ children, className = '' }) => {
  return (
    <th className={`py-3 px-4 text-xs font-semibold text-darkgreen-muted uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
};

export const TableCell = ({ children, className = '' }) => {
  return <td className={`py-3 px-4 text-darkgreen whitespace-nowrap ${className}`}>{children}</td>;
};
