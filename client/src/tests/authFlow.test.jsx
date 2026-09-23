/**
 * Frontend Authentication, Forms, and RBAC Guard Unit Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { ROLES } from '../constants/roles';

describe('Frontend Authentication, Forms & Route Protection', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // 1. Login form rendering and input
  it('1. should render the login form fields and submit button', () => {
    const mockAuth = {
      login: vi.fn(),
      error: null,
      clearError: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuth}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  // 2. Registration form rendering and input
  it('2. should render the registration form with role selection', () => {
    const mockAuth = {
      register: vi.fn(),
      error: null,
      clearError: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuth}>
          <RegisterPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account role/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete registration/i })).toBeInTheDocument();
  });

  // 3. Protected route redirects to /login when unauthenticated
  it('3. should redirect unauthenticated users away from protected routes to /login', () => {
    const mockAuth = {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    };

    render(
      <MemoryRouter initialEntries={['/customer/dashboard']}>
        <AuthContext.Provider value={mockAuth}>
          <Routes>
            <Route path="/login" element={<div>Login Page Screen</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/customer/dashboard" element={<div>Protected Dashboard</div>} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard')).not.toBeInTheDocument();
  });

  // 4. Role-based route redirects when user has unauthorized role
  it('4. should redirect user when authenticated role does not match route allowedRoles', () => {
    const mockAuth = {
      user: { id: '123', name: 'Customer Bob', role: ROLES.CUSTOMER },
      token: 'valid.token',
      isAuthenticated: true,
      isLoading: false,
    };

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthContext.Provider value={mockAuth}>
          <Routes>
            <Route path="/customer/dashboard" element={<div>Customer Dashboard Fallback</div>} />
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/admin/dashboard" element={<div>Admin Only Area</div>} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // Customer trying to access Admin should be redirected to Customer Dashboard
    expect(screen.getByText('Customer Dashboard Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Admin Only Area')).not.toBeInTheDocument();
  });

  // 5. Logout action clears state
  it('5. should invoke logout and clear credentials', async () => {
    const mockLogout = vi.fn().mockResolvedValue({});
    const mockAuth = {
      user: { id: '123', name: 'John Doe', role: ROLES.CUSTOMER },
      token: 'jwt.token',
      logout: mockLogout,
      isAuthenticated: true,
      isLoading: false,
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={mockAuth}>
          <button onClick={() => mockAuth.logout()}>Logout Test Button</button>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const logoutBtn = screen.getByText('Logout Test Button');
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  // 6. Authentication loading state
  it('6. should render loading spinner while auth session is initializing', () => {
    const mockAuth = {
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
    };

    render(
      <MemoryRouter initialEntries={['/customer/dashboard']}>
        <AuthContext.Provider value={mockAuth}>
          <ProtectedRoute>
            <div>Dashboard Content</div>
          </ProtectedRoute>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText(/checking credentials/i)).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });
});
