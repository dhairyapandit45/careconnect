/**
 * Platform Admin Control Center Dashboard
 * Displays real-time operational and platform KPIs from GET /api/v1/admin/stats
 * with date range filtering and quick navigation to administrative consoles.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Briefcase,
  AlertTriangle,
  HelpCircle,
  Receipt,
  DollarSign,
  Filter,
  RotateCcw,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { useAuth } from '../../context/AuthContext';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  LoadingSpinner,
  ErrorState,
} from '../../components/ui';

export const AdminDashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date range filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');

  const fetchStats = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getStats(params, false);
      setStats(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load platform statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    setDateError('');

    if (startDate && endDate) {
      if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
        setDateError('Start date must be less than or equal to End date');
        return;
      }
    }

    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    fetchStats(params);
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setDateError('');
    fetchStats({});
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header & Role Information */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Platform Control Center</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-slate-700">{user?.name}</span> ({user?.role}).
            Live platform metrics, operational oversight, and governance.
          </p>
        </div>
      </div>

      {/* Date Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleApplyFilter} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-slate-700 font-medium text-sm">
              <Filter className="h-4 w-4 text-slate-400" />
              <span>Date Range Filter:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center space-x-2">
                <label htmlFor="startDate" className="text-xs text-slate-500 font-medium">From:</label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateError('');
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center space-x-2">
                <label htmlFor="endDate" className="text-xs text-slate-500 font-medium">To:</label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateError('');
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <Button type="submit" variant="primary" size="sm">
                Apply Filter
              </Button>

              {(startDate || endDate) && (
                <Button type="button" variant="outline" size="sm" onClick={handleResetFilter} icon={RotateCcw}>
                  Reset
                </Button>
              )}
            </div>
          </form>

          {dateError && (
            <p className="text-xs font-semibold text-rose-600 mt-2" role="alert">
              {dateError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-12 flex justify-center items-center">
          <LoadingSpinner size="lg" label="Loading platform statistics..." />
        </div>
      )}

      {error && !loading && (
        <ErrorState
          title="Failed to Load Dashboard Data"
          message={error}
          onRetry={() => fetchStats({ startDate, endDate })}
        />
      )}

      {/* KPI Cards Grid */}
      {!loading && !error && stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Users */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalUsers ?? 0}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Platform Accounts</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 2. Customers */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customers</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.customers ?? 0}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Service Buyers</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
                  <Users className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 3. Service Providers */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Providers</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.serviceProviders ?? 0}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">Registered Pros</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                  <Briefcase className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 4. Active Providers */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Providers</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.activeProviders ?? 0}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Verified & Active</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <UserCheck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 5. Pending Provider Verifications */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Provider Verifications</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingProviderVerification ?? 0}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Action Required</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                  <Shield className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 6. Total Bookings */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bookings</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalBookings ?? 0}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">All Created</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                  <Calendar className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 7. Completed Bookings */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Bookings</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completedBookings ?? 0}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Fulfilled</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 8. Cancelled Bookings */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cancelled Bookings</p>
                  <p className="text-2xl font-bold text-slate-600 mt-1">{stats.cancelledBookings ?? 0}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Terminated</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
                  <XCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 9. Active Jobs */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Jobs</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.activeJobs ?? 0}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">In Progress</span>
                </div>
                <div className="p-3 rounded-xl bg-sky-50 text-sky-600">
                  <Briefcase className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 10. Open Disputes */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Disputes</p>
                  <p className={`text-2xl font-bold mt-1 ${(stats.openDisputes ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {stats.openDisputes ?? 0}
                  </p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Resolution Queue</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 11. Unresolved Support Tickets */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unresolved Support Tickets</p>
                  <p className={`text-2xl font-bold mt-1 ${(stats.unresolvedSupportTickets ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {stats.unresolvedSupportTickets ?? 0}
                  </p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">Open Tickets</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
                  <HelpCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 12. Total Invoices */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoices</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalInvoices ?? 0}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">Billing Records</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                  <Receipt className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 13. Paid Invoices */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid Invoices</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.paidInvoices ?? 0}</p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Settled</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* 14. Total Revenue */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                  <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Gross Processed</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <DollarSign className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Console Navigation Links */}
          <Card>
            <CardHeader
              title="Administrative & Operational Consoles"
              subtitle="Quick navigation to core governance and platform oversight modules"
            />
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Link
                  to="/admin/users"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">User Management</p>
                      <p className="text-xs text-slate-500">Inspect & update accounts</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>

                <Link
                  to="/admin/providers"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Provider Verification</p>
                      <p className="text-xs text-slate-500">Audit licenses & credentials</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>

                <Link
                  to="/admin/bookings"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Bookings Oversight</p>
                      <p className="text-xs text-slate-500">Inspect schedules & appointments</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>

                <Link
                  to="/admin/jobs"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Job Operations</p>
                      <p className="text-xs text-slate-500">Track execution & completions</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>

                <Link
                  to="/admin/disputes"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Dispute Cases</p>
                      <p className="text-xs text-slate-500">Review open escalations</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>

                <Link
                  to="/admin/tickets"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Support Tickets</p>
                      <p className="text-xs text-slate-500">Triage customer & provider issues</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
