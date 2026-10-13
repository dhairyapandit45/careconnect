/**
 * Milestone 9C: Analytics UI Test Suite
 * Vitest / React Testing Library verification covering:
 * - Rendering overview KPIs, booking trends, revenue metrics, provider rankings,
 *   category demand, disputes, and support SLA stats
 * - RBAC protection for /admin/analytics and /operations/analytics
 * - Date range filtering, validation (startDate <= endDate), and reset
 * - Loading, error retry, and empty state rendering
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { AnalyticsDashboardPage } from '../pages/admin/AnalyticsDashboardPage';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { analyticsService } from '../services/analytics.service';
import { ROLES } from '../constants/roles';

vi.mock('../services/analytics.service', () => ({
  analyticsService: {
    getOverview: vi.fn(),
    getBookingTrends: vi.fn(),
    getRevenueTrends: vi.fn(),
    getProviderPerformance: vi.fn(),
    getCategoryDemand: vi.fn(),
    getDisputeTrends: vi.fn(),
    getSupportTrends: vi.fn(),
  },
}));

const mockOverviewData = {
  bookings: {
    totalBookings: 50,
    completedBookings: 35,
    cancelledBookings: 5,
    completionRate: 70,
    cancellationRate: 10,
  },
  revenue: {
    totalInvoices: 45,
    paidInvoices: 40,
    totalInvoiced: 4500,
    paidRevenue: 4000,
    paidRate: 88.89,
  },
  disputes: {
    totalDisputes: 4,
    resolvedCount: 3,
    resolutionRate: 75,
  },
  support: {
    totalTickets: 12,
    resolvedCount: 10,
    resolutionRate: 83.33,
  },
};

const mockBookingTrendsData = {
  summary: {
    totalBookings: 50,
    completedBookings: 35,
    cancelledBookings: 5,
    inProgressBookings: 6,
    confirmedBookings: 4,
    completionRate: 70,
    cancellationRate: 10,
  },
  timeline: [
    { date: '2026-10-01', total: 20, completed: 15, cancelled: 2, inProgress: 3 },
    { date: '2026-10-02', total: 30, completed: 20, cancelled: 3, inProgress: 3 },
  ],
};

const mockRevenueTrendsData = {
  summary: {
    totalInvoices: 45,
    paidInvoices: 40,
    totalInvoiced: 4500,
    paidRevenue: 4000,
    paidRate: 88.89,
  },
  timeline: [
    { date: '2026-10-01', totalInvoiced: 2000, paidRevenue: 1800, totalInvoices: 20, paidInvoices: 18 },
    { date: '2026-10-02', totalInvoiced: 2500, paidRevenue: 2200, totalInvoices: 25, paidInvoices: 22 },
  ],
};

const mockProvidersData = {
  providers: [
    {
      providerId: 'p1',
      name: 'Dave Plumber',
      businessName: 'Dave Fast Plumbing',
      rating: 4.8,
      totalJobs: 25,
      completedJobs: 20,
      cancelledJobs: 2,
      completionRate: 80,
      revenue: 2500,
    },
    {
      providerId: 'p2',
      name: 'Eve Electric',
      businessName: 'Eve Pro Power',
      rating: 4.9,
      totalJobs: 18,
      completedJobs: 15,
      cancelledJobs: 1,
      completionRate: 83.33,
      revenue: 1800,
    },
  ],
  totalCount: 2,
};

const mockCategoriesData = {
  categories: [
    { categoryId: 'c1', name: 'Plumbing', bookingCount: 30, requestCount: 35, totalRevenue: 3000 },
    { categoryId: 'c2', name: 'Electrical', bookingCount: 20, requestCount: 25, totalRevenue: 2000 },
  ],
  totalCategories: 2,
};

const mockDisputesData = {
  totalDisputes: 4,
  resolvedCount: 3,
  resolutionRate: 75,
  refundApprovedCount: 1,
  refundAmountTotal: 10000,
  byStatus: { OPEN: 1, UNDER_REVIEW: 0, RESOLVED: 2, REJECTED: 1, CANCELLED: 0 },
  byCategory: [{ category: 'QUALITY_OF_WORK', count: 3 }, { category: 'BILLING', count: 1 }],
};

const mockSupportData = {
  totalTickets: 12,
  resolvedCount: 10,
  resolutionRate: 83.33,
  byStatus: { OPEN: 2, IN_PROGRESS: 0, RESOLVED: 8, CLOSED: 2 },
  byPriority: { LOW: 2, MEDIUM: 6, HIGH: 3, URGENT: 1 },
  byCategory: [{ category: 'BOOKING', count: 8 }, { category: 'PAYMENT', count: 4 }],
};

const renderWithAuth = (ui, { user, initialRoute = '/admin/analytics' } = {}) => {
  const authValue = {
    user: user || { id: 'u1', name: 'Platform Admin', role: ROLES.PLATFORM_ADMIN },
    isAuthenticated: Boolean(user),
    isLoading: false,
  };

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('Milestone 9C — Analytics Frontend UI Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analyticsService.getOverview.mockResolvedValue({ success: true, data: mockOverviewData });
    analyticsService.getBookingTrends.mockResolvedValue({ success: true, data: mockBookingTrendsData });
    analyticsService.getRevenueTrends.mockResolvedValue({ success: true, data: mockRevenueTrendsData });
    analyticsService.getProviderPerformance.mockResolvedValue({ success: true, data: mockProvidersData });
    analyticsService.getCategoryDemand.mockResolvedValue({ success: true, data: mockCategoriesData });
    analyticsService.getDisputeTrends.mockResolvedValue({ success: true, data: mockDisputesData });
    analyticsService.getSupportTrends.mockResolvedValue({ success: true, data: mockSupportData });
  });

  // --------------------------------------------------------------------------
  // 1. Rendering on /admin/analytics
  // --------------------------------------------------------------------------
  it('1. should render Admin Analytics Dashboard with KPI cards and timelines for PLATFORM_ADMIN', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>,
      {
        user: { id: 'adm1', name: 'Admin Alice', role: ROLES.PLATFORM_ADMIN },
        initialRoute: '/admin/analytics',
      }
    );

    // Initial loading indicator
    expect(screen.getByText(/aggregating platform intelligence/i)).toBeInTheDocument();

    // Data resolves
    await waitFor(() => {
      expect(screen.getByText(/Platform Analytics & Intelligence/i)).toBeInTheDocument();
    });

    // Overview KPIs rendered
    expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    expect(screen.getAllByText('Paid Revenue').length).toBeGreaterThan(0);
    expect(screen.getByText('Disputes Oversight')).toBeInTheDocument();
    expect(screen.getByText('Support Tickets')).toBeInTheDocument();

    // Rates verified
    expect(screen.getByText('70%')).toBeInTheDocument(); // Completion rate
    expect(screen.getByText('88.89%')).toBeInTheDocument(); // Paid collection rate
  });

  // --------------------------------------------------------------------------
  // 2. Rendering on /operations/analytics
  // --------------------------------------------------------------------------
  it('2. should render Operations Analytics Dashboard for OPERATIONS_MANAGER', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/operations/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>,
      {
        user: { id: 'ops1', name: 'Ops Jack', role: ROLES.OPERATIONS_MANAGER },
        initialRoute: '/operations/analytics',
      }
    );

    await waitFor(() => {
      expect(screen.getByText(/Operations Analytics & Performance/i)).toBeInTheDocument();
    });

    expect(screen.getByText('OPERATIONS')).toBeInTheDocument();
    expect(analyticsService.getOverview).toHaveBeenCalledWith({}, true);
  });

  // --------------------------------------------------------------------------
  // 3. RBAC Protection
  // --------------------------------------------------------------------------
  it('3. should block non-privileged roles (CUSTOMER) from accessing /admin/analytics', async () => {
    renderWithAuth(
      <Routes>
        <Route element={<ProtectedRoute allowedRoles={[ROLES.PLATFORM_ADMIN]} />}>
          <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
        </Route>
        <Route path="/customer/dashboard" element={<div>Access Denied</div>} />
        <Route path="/unauthorized" element={<div>Access Denied</div>} />
      </Routes>,
      {
        user: { id: 'c1', name: 'Customer Bob', role: ROLES.CUSTOMER },
        initialRoute: '/admin/analytics',
      }
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Platform Analytics & Intelligence/i)).not.toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 4. Date Range Filtering & Validation
  // --------------------------------------------------------------------------
  it('4. should trigger API re-fetch when valid date range is applied', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>,
      {
        user: { id: 'adm1', name: 'Admin Alice', role: ROLES.PLATFORM_ADMIN },
        initialRoute: '/admin/analytics',
      }
    );

    await waitFor(() => {
      expect(screen.getByText(/Platform Analytics & Intelligence/i)).toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText(/From Date/i);
    const endDateInput = screen.getByLabelText(/To Date/i);
    const applyButton = screen.getByRole('button', { name: /Apply Filter/i });

    fireEvent.change(startDateInput, { target: { value: '2026-10-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-10-02' } });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(analyticsService.getOverview).toHaveBeenCalledWith(
        { startDate: '2026-10-01', endDate: '2026-10-02' },
        false
      );
    });
  });

  it('5. should reject inverted date range (startDate > endDate) with validation alert', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>,
      {
        user: { id: 'adm1', name: 'Admin Alice', role: ROLES.PLATFORM_ADMIN },
        initialRoute: '/admin/analytics',
      }
    );

    await waitFor(() => {
      expect(screen.getByText(/Platform Analytics & Intelligence/i)).toBeInTheDocument();
    });

    analyticsService.getOverview.mockClear();

    const startDateInput = screen.getByLabelText(/From Date/i);
    const endDateInput = screen.getByLabelText(/To Date/i);
    const applyButton = screen.getByRole('button', { name: /Apply Filter/i });

    fireEvent.change(startDateInput, { target: { value: '2026-10-15' } });
    fireEvent.change(endDateInput, { target: { value: '2026-10-01' } });
    fireEvent.click(applyButton);

    expect(
      screen.getByText(/Start date must be less than or equal to End date/i)
    ).toBeInTheDocument();
    expect(analyticsService.getOverview).not.toHaveBeenCalled();
  });

  it('6. should reset date filter and re-fetch default lifetime metrics', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>,
      {
        user: { id: 'adm1', name: 'Admin Alice', role: ROLES.PLATFORM_ADMIN },
        initialRoute: '/admin/analytics',
      }
    );

    await waitFor(() => {
      expect(screen.getByText(/Platform Analytics & Intelligence/i)).toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText(/From Date/i);
    const resetButton = screen.getByRole('button', { name: /Reset/i });

    fireEvent.change(startDateInput, { target: { value: '2026-10-01' } });
    fireEvent.click(resetButton);

    expect(startDateInput.value).toBe('');
    await waitFor(() => {
      expect(analyticsService.getOverview).toHaveBeenCalledWith({}, false);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Booking Trends Daily Timeline
  // --------------------------------------------------------------------------
  it('7. should display booking trends daily rows with status breakdown', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>,
      {
        user: { id: 'adm1', name: 'Admin Alice', role: ROLES.PLATFORM_ADMIN },
        initialRoute: '/admin/analytics',
      }
    );

    await waitFor(() => {
      expect(screen.getByText('Booking Trends by Date')).toBeInTheDocument();
    });

    expect(screen.getAllByText('2026-10-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-10-02').length).toBeGreaterThan(0);
    expect(screen.getByText('10%')).toBeInTheDocument(); // Cancellation rate
  });

  // --------------------------------------------------------------------------
  // 6. Provider Performance Rankings
  // --------------------------------------------------------------------------
  it('8. should render provider performance rankings with rating and completed jobs', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>,
      {
        user: { id: 'adm1', name: 'Admin Alice', role: ROLES.PLATFORM_ADMIN },
        initialRoute: '/admin/analytics',
      }
    );

    await waitFor(() => {
      expect(screen.getByText('Provider Performance Rankings')).toBeInTheDocument();
    });

    expect(screen.getByText('Dave Plumber')).toBeInTheDocument();
    expect(screen.getByText('Eve Electric')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 7. Category Demand
  // --------------------------------------------------------------------------
  it('9. should display category demand rankings', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>,
      {
        user: { id: 'adm1', name: 'Admin Alice', role: ROLES.PLATFORM_ADMIN },
        initialRoute: '/admin/analytics',
      }
    );

    await waitFor(() => {
      expect(screen.getByText('Service Category Demand')).toBeInTheDocument();
    });

    expect(screen.getByText('Plumbing')).toBeInTheDocument();
    expect(screen.getByText('Electrical')).toBeInTheDocument();
    expect(screen.getAllByText('30').length).toBeGreaterThan(0); // Plumbing bookings
  });

  // --------------------------------------------------------------------------
  // 8. Disputes & Support SLA
  // --------------------------------------------------------------------------
  it('10. should display dispute metrics and support ticket priority breakdown', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>,
      {
        user: { id: 'adm1', name: 'Admin Alice', role: ROLES.PLATFORM_ADMIN },
        initialRoute: '/admin/analytics',
      }
    );

    await waitFor(() => {
      expect(screen.getByText('Dispute Trends & SLA')).toBeInTheDocument();
    });

    expect(screen.getByText('Support Ticket Operations')).toBeInTheDocument();
    expect(screen.getByText('Resolution: 75%')).toBeInTheDocument();
    expect(screen.getByText('Resolution: 83.33%')).toBeInTheDocument();
    expect(screen.getByText('QUALITY_OF_WORK:')).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 9. Error State & Retry
  // --------------------------------------------------------------------------
  it('11. should display error state when API fails and allow retry', async () => {
    analyticsService.getOverview.mockRejectedValueOnce(new Error('Network gateway error'));

    renderWithAuth(
      <Routes>
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>,
      {
        user: { id: 'adm1', name: 'Admin Alice', role: ROLES.PLATFORM_ADMIN },
        initialRoute: '/admin/analytics',
      }
    );

    await waitFor(() => {
      expect(screen.getByText('Analytics Unavailable')).toBeInTheDocument();
    });
    expect(screen.getByText(/Network gateway error/i)).toBeInTheDocument();

    // Click retry
    analyticsService.getOverview.mockResolvedValueOnce({ success: true, data: mockOverviewData });
    const retryButton = screen.getByRole('button', { name: /Try Again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/Platform Analytics & Intelligence/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 10. Empty State
  // --------------------------------------------------------------------------
  it('12. should render empty state panels when zero analytics data is returned', async () => {
    analyticsService.getBookingTrends.mockResolvedValue({
      success: true,
      data: { summary: {}, timeline: [] },
    });
    analyticsService.getRevenueTrends.mockResolvedValue({
      success: true,
      data: { summary: {}, timeline: [] },
    });
    analyticsService.getProviderPerformance.mockResolvedValue({
      success: true,
      data: { providers: [], totalCount: 0 },
    });
    analyticsService.getCategoryDemand.mockResolvedValue({
      success: true,
      data: { categories: [], totalCategories: 0 },
    });

    renderWithAuth(
      <Routes>
        <Route path="/admin/analytics" element={<AnalyticsDashboardPage />} />
      </Routes>,
      {
        user: { id: 'adm1', name: 'Admin Alice', role: ROLES.PLATFORM_ADMIN },
        initialRoute: '/admin/analytics',
      }
    );

    await waitFor(() => {
      expect(screen.getByText('No Booking Trends')).toBeInTheDocument();
    });

    expect(screen.getByText('No Revenue Activity')).toBeInTheDocument();
    expect(screen.getByText('No Provider Activity')).toBeInTheDocument();
    expect(screen.getByText('No Category Demand')).toBeInTheDocument();
  });
});
