/**
 * 404 Not Found Page
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Home } from 'lucide-react';
import { Button } from '../components/ui';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 mb-6">
        <Wrench className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404</h1>
      <h2 className="mt-2 text-lg font-semibold text-slate-700">Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        The requested URL was not found on CareConnect. Please verify the address or return home.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button icon={Home}>Return Home</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
