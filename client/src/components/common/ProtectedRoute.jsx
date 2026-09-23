/**
 * Protected Route Component
 * Restricts access to authenticated users and specific roles.
 */

import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ROLE_DASHBOARD_ROUTES } from '../../constants/roles';

export const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" label="Checking credentials..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to the user's appropriate default dashboard
    const fallbackRoute = ROLE_DASHBOARD_ROUTES[user.role] || '/login';
    return <Navigate to={fallbackRoute} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
