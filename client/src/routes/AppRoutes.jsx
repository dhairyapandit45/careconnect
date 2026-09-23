/**
 * Application Routing Table & Route Guards
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES, ROLE_DASHBOARD_ROUTES } from '../constants/roles';

// Layout
import { DashboardLayout } from '../components/layout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';

// Customer Pages
import { CustomerDashboard } from '../pages/customer/CustomerDashboard';
import { CustomerRequests } from '../pages/customer/CustomerRequests';
import { CreateRequestPage } from '../pages/customer/CreateRequestPage';
import { RequestDetailPage } from '../pages/customer/RequestDetailPage';
import { CustomerBookings } from '../pages/customer/CustomerBookings';
import { CustomerQuotes } from '../pages/customer/CustomerQuotes';
import { CustomerInvoices } from '../pages/customer/CustomerInvoices';
import { CustomerReviews } from '../pages/customer/CustomerReviews';

// Provider Pages
import { ProviderDashboard } from '../pages/provider/ProviderDashboard';
import { ProviderOnboardingWizard } from '../pages/provider/ProviderOnboardingWizard';
import { ProviderRequests } from '../pages/provider/ProviderRequests';
import { ProviderQuotes } from '../pages/provider/ProviderQuotes';
import { ProviderBookings } from '../pages/provider/ProviderBookings';
import { ProviderAvailability } from '../pages/provider/ProviderAvailability';
import { ProviderProfile } from '../pages/provider/ProviderProfile';

// Support, Operations & Admin Dashboards
import { SupportDashboard } from '../pages/support/SupportDashboard';
import { OperationsDashboard } from '../pages/operations/OperationsDashboard';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage';
import { AdminProvidersPage } from '../pages/admin/AdminProvidersPage';

// 404 Page
import { NotFoundPage } from '../pages/NotFoundPage';

/**
 * Root index redirector based on authentication state
 */
const RootRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const destination = ROLE_DASHBOARD_ROUTES[user.role] || '/login';
  return <Navigate to={destination} replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Dashboard Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Customer Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.CUSTOMER]} />}>
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/customer/requests" element={<CustomerRequests />} />
            <Route path="/customer/requests/new" element={<CreateRequestPage />} />
            <Route path="/customer/requests/:id" element={<RequestDetailPage />} />
            <Route path="/customer/bookings" element={<CustomerBookings />} />
            <Route path="/customer/quotes" element={<CustomerQuotes />} />
            <Route path="/customer/invoices" element={<CustomerInvoices />} />
            <Route path="/customer/reviews" element={<CustomerReviews />} />
          </Route>

          {/* Provider Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.SERVICE_PROVIDER]} />}>
            <Route path="/provider/dashboard" element={<ProviderDashboard />} />
            <Route path="/provider/onboarding" element={<ProviderOnboardingWizard />} />
            <Route path="/provider/requests" element={<ProviderRequests />} />
            <Route path="/provider/quotes" element={<ProviderQuotes />} />
            <Route path="/provider/bookings" element={<ProviderBookings />} />
            <Route path="/provider/availability" element={<ProviderAvailability />} />
            <Route path="/provider/profile" element={<ProviderProfile />} />
          </Route>

          {/* Support Agent Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPPORT_AGENT]} />}>
            <Route path="/support/dashboard" element={<SupportDashboard />} />
          </Route>

          {/* Operations Manager Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.OPERATIONS_MANAGER]} />}>
            <Route path="/operations/dashboard" element={<OperationsDashboard />} />
          </Route>

          {/* Platform Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={[ROLES.PLATFORM_ADMIN]} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/providers" element={<AdminProvidersPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          </Route>
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
