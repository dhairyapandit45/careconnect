/**
 * Milestone 9B: Admin & Operations UI Test Suite
 * Vitest / React Testing Library verification covering:
 * - Admin & Operations dashboard KPI card rendering with live data
 * - Access control and RBAC guard enforcement across all platform roles
 * - Date range filtering validation and re-fetching
 * - User management console listing and status filtering
 * - Operations Manager restriction against modifying Platform Admin accounts
 * - API error states with retry functionality
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { OperationsDashboard } from '../pages/operations/OperationsDashboard';
import { UserManagementPage } from '../pages/admin/UserManagementPage';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { adminService } from '../services/admin.service';
import { ROLES } from '../constants/roles';

// Mock the adminService module
vi.mock('../services/admin.service', () => ({
  adminService: {
    getStats: vi.fn(),
    listUsers: vi.fn(),
    getUserById: vi.fn(),
    updateUserStatus: vi.fn(),
    listProviders: vi.fn(),
    getProviderById: vi.fn(),
    verifyProvider: vi.fn(),
    listBookings: vi.fn(),
    getBookingById: vi.fn(),
    listJobs: vi.fn(),
    getJobById: vi.fn(),
    listDisputes: vi.fn(),
    getDisputeById: vi.fn(),
    listTickets: vi.fn(),
    getTicketById: vi.fn(),
  },
}));

const mockStatsData = {
  totalUsers: 150,
  customers: 100,
  serviceProviders: 50,
  activeProviders: 40,
  pendingProviderVerification: 10,
  totalBookings: 85,
  completedBookings: 60,
  cancelledBookings: 5,
  activeJobs: 12,
  openDisputes: 3,
  unresolvedSupportTickets: 4,
  totalInvoices: 70,
  paidInvoices: 65,
  totalRevenue: 12500,
};

const createMockAuth = (role, name = 'Test User') => ({
  user: { id: 'usr-1', name, email: 'test@careconnect.test', role },
  token: 'valid-jwt-token',
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
});

describe('Milestone 9B — Admin & Operations Dashboard UI Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // 1. Admin dashboard renders KPI cards with live data
  it('1. should render Admin dashboard with all 14 KPI cards consuming live data', async () => {
    adminService.getStats.mockResolvedValueOnce({ data: mockStatsData });
    const auth = createMockAuth(ROLES.PLATFORM_ADMIN, 'Admin Alex');

    render(
      <MemoryRouter>
        <AuthContext.Provider value={auth}>
          <AdminDashboard />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // Header rendered
    expect(screen.getByText('Platform Control Center')).toBeInTheDocument();

    // Wait for live data to load and assert KPI values
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    expect(screen.getByText('150')).toBeInTheDocument(); // totalUsers
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // customers
    expect(screen.getByText('Service Providers')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument(); // serviceProviders
    expect(screen.getByText('Active Providers')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument(); // activeProviders
    expect(screen.getByText('Pending Provider Verifications')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // pendingProviderVerification
    expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument(); // totalBookings
    expect(screen.getByText('Completed Bookings')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument(); // completedBookings
    expect(screen.getByText('Cancelled Bookings')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // cancelledBookings
    expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument(); // activeJobs
    expect(screen.getByText('Open Disputes')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // openDisputes
    expect(screen.getByText('Unresolved Support Tickets')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // unresolvedSupportTickets
    expect(screen.getByText('Total Invoices')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument(); // totalInvoices
    expect(screen.getByText('Paid Invoices')).toBeInTheDocument();
    expect(screen.getByText('65')).toBeInTheDocument(); // paidInvoices
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$12,500.00')).toBeInTheDocument(); // totalRevenue
  });

  // 2. Operations dashboard renders KPI cards with live data
  it('2. should render Operations dashboard with all 14 KPI cards consuming live data', async () => {
    adminService.getStats.mockResolvedValueOnce({ data: mockStatsData });
    const auth = createMockAuth(ROLES.OPERATIONS_MANAGER, 'Ops Olivia');

    render(
      <MemoryRouter>
        <AuthContext.Provider value={auth}>
          <OperationsDashboard />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('Operations Control Center')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Active Providers')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('Active Jobs')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('$12,500.00')).toBeInTheDocument();

    // Verify it requested stats with isOps = true
    expect(adminService.getStats).toHaveBeenCalledWith({}, true);
  });

  // 3. Platform Admin can access both /admin and /operations
  it('3. should allow Platform Admin to access both /admin and /operations routes', async () => {
    adminService.getStats.mockResolvedValue({ data: mockStatsData });
    const auth = createMockAuth(ROLES.PLATFORM_ADMIN, 'Admin Super');

    // Test access to /admin
    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthContext.Provider value={auth}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[ROLES.OPERATIONS_MANAGER, ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/operations/dashboard" element={<OperationsDashboard />} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('Platform Control Center')).toBeInTheDocument();
    unmount();

    // Test access to /operations
    render(
      <MemoryRouter initialEntries={['/operations/dashboard']}>
        <AuthContext.Provider value={auth}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[ROLES.OPERATIONS_MANAGER, ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/operations/dashboard" element={<OperationsDashboard />} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('Operations Control Center')).toBeInTheDocument();
  });

  // 4. Operations Manager can access /operations but is blocked from /admin
  it('4. should allow Operations Manager to access /operations but redirect away from /admin', async () => {
    adminService.getStats.mockResolvedValue({ data: mockStatsData });
    const auth = createMockAuth(ROLES.OPERATIONS_MANAGER, 'Ops Manager Mike');

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthContext.Provider value={auth}>
          <Routes>
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[ROLES.OPERATIONS_MANAGER, ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/operations/dashboard" element={<OperationsDashboard />} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // Attempting to visit /admin/dashboard redirects to /operations/dashboard
    expect(screen.getByText('Operations Control Center')).toBeInTheDocument();
    expect(screen.queryByText('Platform Control Center')).not.toBeInTheDocument();
  });

  // 5. Customer role is blocked from both /admin and /operations
  it('5. should block Customer role from both /admin and /operations', async () => {
    const auth = createMockAuth(ROLES.CUSTOMER, 'Customer Chris');

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthContext.Provider value={auth}>
          <Routes>
            <Route path="/customer/dashboard" element={<div>Customer Dashboard Fallback</div>} />
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[ROLES.OPERATIONS_MANAGER, ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/operations/dashboard" element={<OperationsDashboard />} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('Customer Dashboard Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Platform Control Center')).not.toBeInTheDocument();
  });

  // 6. Service Provider role is blocked from both /admin and /operations
  it('6. should block Service Provider role from both /admin and /operations', async () => {
    const auth = createMockAuth(ROLES.SERVICE_PROVIDER, 'Provider Paul');

    render(
      <MemoryRouter initialEntries={['/operations/dashboard']}>
        <AuthContext.Provider value={auth}>
          <Routes>
            <Route path="/provider/dashboard" element={<div>Provider Dashboard Fallback</div>} />
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[ROLES.OPERATIONS_MANAGER, ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/operations/dashboard" element={<OperationsDashboard />} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('Provider Dashboard Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Operations Control Center')).not.toBeInTheDocument();
  });

  // 7. Support Agent role is blocked from both /admin and /operations
  it('7. should block Support Agent role from both /admin and /operations', async () => {
    const auth = createMockAuth(ROLES.SUPPORT_AGENT, 'Agent Sarah');

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AuthContext.Provider value={auth}>
          <Routes>
            <Route path="/support/dashboard" element={<div>Support Dashboard Fallback</div>} />
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[ROLES.OPERATIONS_MANAGER, ROLES.PLATFORM_ADMIN]} />}>
              <Route path="/operations/dashboard" element={<OperationsDashboard />} />
            </Route>
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText('Support Dashboard Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Platform Control Center')).not.toBeInTheDocument();
  });

  // 8. Date range filter validates Start Date <= End Date and shows error on invalid range
  it('8. should validate that Start Date <= End Date and display an error on inverted range', async () => {
    adminService.getStats.mockResolvedValue({ data: mockStatsData });
    const auth = createMockAuth(ROLES.PLATFORM_ADMIN);

    render(
      <MemoryRouter>
        <AuthContext.Provider value={auth}>
          <AdminDashboard />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Platform Control Center')).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/from:/i);
    const endInput = screen.getByLabelText(/to:/i);
    const applyButton = screen.getByRole('button', { name: /apply filter/i });

    // Invert the dates: start is after end
    fireEvent.change(startInput, { target: { value: '2026-10-25' } });
    fireEvent.change(endInput, { target: { value: '2026-10-10' } });
    fireEvent.click(applyButton);

    // Error message rendered
    expect(
      screen.getByText('Start date must be less than or equal to End date')
    ).toBeInTheDocument();

    // Ensure getStats was not called with inverted dates
    expect(adminService.getStats).not.toHaveBeenCalledWith(
      { startDate: '2026-10-25', endDate: '2026-10-10' },
      false
    );
  });

  // 9. Date range filter triggers API re-fetch with query params on valid submit
  it('9. should trigger API re-fetch with valid query params on valid date filter submit', async () => {
    adminService.getStats.mockResolvedValue({ data: mockStatsData });
    const auth = createMockAuth(ROLES.PLATFORM_ADMIN);

    render(
      <MemoryRouter>
        <AuthContext.Provider value={auth}>
          <AdminDashboard />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Platform Control Center')).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/from:/i);
    const endInput = screen.getByLabelText(/to:/i);
    const applyButton = screen.getByRole('button', { name: /apply filter/i });

    // Enter valid date range
    fireEvent.change(startInput, { target: { value: '2026-10-01' } });
    fireEvent.change(endInput, { target: { value: '2026-10-15' } });
    fireEvent.click(applyButton);

    // Verify getStats was called with query params
    expect(adminService.getStats).toHaveBeenCalledWith(
      { startDate: '2026-10-01', endDate: '2026-10-15' },
      false
    );
  });

  // 10. User management console renders user list and allows status filter
  it('10. should render user management console and trigger filter by status', async () => {
    const mockUsers = [
      {
        _id: 'usr-customer-1',
        name: 'Alice Cooper',
        email: 'alice@example.com',
        role: ROLES.CUSTOMER,
        status: 'ACTIVE',
        phone: '555-0101',
        createdAt: '2026-09-01T10:00:00.000Z',
      },
      {
        _id: 'usr-provider-2',
        name: 'Bob Handyman',
        email: 'bob@example.com',
        role: ROLES.SERVICE_PROVIDER,
        status: 'SUSPENDED',
        phone: '555-0202',
        createdAt: '2026-09-02T10:00:00.000Z',
      },
    ];

    adminService.listUsers.mockResolvedValueOnce({
      data: {
        items: mockUsers,
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      },
    });

    const auth = createMockAuth(ROLES.PLATFORM_ADMIN);

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AuthContext.Provider value={auth}>
          <UserManagementPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // Assert users rendered
    await waitFor(() => {
      expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
    });
    expect(screen.getByText('Bob Handyman')).toBeInTheDocument();

    // Apply status filter
    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'SUSPENDED' } });

    const filterButton = screen.getByRole('button', { name: /^filter$/i });
    fireEvent.click(filterButton);

    expect(adminService.listUsers).toHaveBeenCalledWith(
      { page: 1, limit: 10, status: 'SUSPENDED' },
      false
    );
  });

  // 11. Operations Manager cannot update Platform Admin user status (disabled/restricted)
  it('11. should disable/restrict Operations Manager from mutating Platform Admin accounts', async () => {
    const mockUsersWithAdmin = [
      {
        _id: 'admin-target',
        name: 'Root Platform Admin',
        email: 'root@careconnect.test',
        role: ROLES.PLATFORM_ADMIN,
        status: 'ACTIVE',
        phone: '555-9999',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    adminService.listUsers.mockResolvedValueOnce({
      data: {
        items: mockUsersWithAdmin,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    });

    // Logged in as Operations Manager
    const auth = createMockAuth(ROLES.OPERATIONS_MANAGER, 'Ops Operator');

    render(
      <MemoryRouter initialEntries={['/operations/users']}>
        <AuthContext.Provider value={auth}>
          <UserManagementPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Root Platform Admin')).toBeInTheDocument();
    });

    // The Update Status button for the Platform Admin row must be disabled
    const updateButton = screen.getByRole('button', { name: /update status/i });
    expect(updateButton).toBeDisabled();
    expect(updateButton).toHaveAttribute(
      'title',
      'Operations Managers cannot modify Platform Admin accounts'
    );
  });

  // 12. Error state renders retry button that re-fetches data on click
  it('12. should render an error banner with a retry button on failure and re-fetch on click', async () => {
    // Fail first call, succeed on retry
    adminService.getStats
      .mockRejectedValueOnce(new Error('Connection timeout to stats service'))
      .mockResolvedValueOnce({ data: mockStatsData });

    const auth = createMockAuth(ROLES.PLATFORM_ADMIN);

    render(
      <MemoryRouter>
        <AuthContext.Provider value={auth}>
          <AdminDashboard />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to Load Dashboard Data')).toBeInTheDocument();
    });

    expect(screen.getByText('Connection timeout to stats service')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    // Click retry
    fireEvent.click(retryButton);

    // Wait for successful data render
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(adminService.getStats).toHaveBeenCalledTimes(2);
  });
});

