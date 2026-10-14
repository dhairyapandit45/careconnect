/**
 * Unified Analytics Dashboard Page
 * Accessible by PLATFORM_ADMIN (at /admin/analytics) and OPERATIONS_MANAGER (at /operations/analytics).
 * Consumes Milestone 9C backend analytics endpoints:
 * - Overview KPIs
 * - Daily booking trends and completion/cancellation rates
 * - Revenue trends (paid revenue vs total invoiced)
 * - Provider performance rankings
 * - Service category demand
 * - Dispute resolution analytics
 * - Support ticket volume, priority, and SLA metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  TrendingUp,
  Calendar,
  IndianRupee,
  AlertTriangle,
  HelpCircle,
  Users,
  Layers,
  Filter,
  RotateCcw,
  Star,
  Activity,
} from 'lucide-react';
import { analyticsService } from '../../services/analytics.service';
import { formatCurrency as formatCurrencyUtil } from '../../utils/currency';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  LoadingSpinner,
  ErrorState,
  Badge,
  EmptyState,
} from '../../components/ui';

export const AnalyticsDashboardPage = () => {
  const location = useLocation();
  const isOps = location.pathname.startsWith('/operations');

  // Primary state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics data buckets
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    bookings: null,
    revenue: null,
    providers: [],
    categories: [],
    disputes: null,
    support: null,
  });

  // Date filtering state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [appliedRange, setAppliedRange] = useState({ startDate: '', endDate: '' });

  const fetchAnalytics = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewRes,
        bookingsRes,
        revenueRes,
        providersRes,
        categoriesRes,
        disputesRes,
        supportRes,
      ] = await Promise.all([
        analyticsService.getOverview(params, isOps),
        analyticsService.getBookingTrends(params, isOps),
        analyticsService.getRevenueTrends(params, isOps),
        analyticsService.getProviderPerformance({ ...params, limit: 15 }, isOps),
        analyticsService.getCategoryDemand(params, isOps),
        analyticsService.getDisputeTrends(params, isOps),
        analyticsService.getSupportTrends(params, isOps),
      ]);

      setAnalyticsData({
        overview: overviewRes?.data || null,
        bookings: bookingsRes?.data || null,
        revenue: revenueRes?.data || null,
        providers: providersRes?.data?.providers || [],
        categories: categoriesRes?.data?.categories || [],
        disputes: disputesRes?.data || null,
        support: supportRes?.data || null,
      });
      setAppliedRange({
        startDate: params.startDate || '',
        endDate: params.endDate || '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load platform analytics data.');
    } finally {
      setLoading(false);
    }
  }, [isOps]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

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
    fetchAnalytics(params);
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    setDateError('');
    fetchAnalytics({});
  };

  const formatCurrency = (val) => {
    return formatCurrencyUtil(val, { maximumFractionDigits: 0 });
  };

  const { bookings, revenue, providers, categories, disputes, support } = analyticsData;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-darkgreen">
              {isOps ? 'Operations Analytics & Performance' : 'Platform Analytics & Intelligence'}
            </h1>
            <Badge variant={isOps ? 'secondary' : 'default'} className="font-semibold text-xs">
              {isOps ? 'OPERATIONS' : 'ADMIN'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-darkgreen-muted">
            Real-time domain metrics, revenue trends, completion rates, and provider performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {appliedRange.startDate || appliedRange.endDate ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-palesage px-3 py-1 text-xs font-medium text-forest-deep">
              <Calendar className="h-3.5 w-3.5" />
              {appliedRange.startDate || 'Start'} → {appliedRange.endDate || 'Present'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ivory border border-themeborder px-3 py-1 text-xs font-medium text-darkgreen-muted">
              <Activity className="h-3.5 w-3.5" />
              Lifetime Platform Data
            </span>
          )}
        </div>
      </div>

      {/* Date Filter Bar */}
      <Card className="border border-themeborder shadow-xs">
        <CardContent className="p-4">
          <form onSubmit={handleApplyFilter} className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:w-2/3">
              <div>
                <label htmlFor="analytics-start-date" className="block text-xs font-medium text-darkgreen mb-1">
                  From Date
                </label>
                <input
                  id="analytics-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-md border border-themeborder px-3 py-1.5 text-sm text-darkgreen focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>
              <div>
                <label htmlFor="analytics-end-date" className="block text-xs font-medium text-darkgreen mb-1">
                  To Date
                </label>
                <input
                  id="analytics-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-md border border-themeborder px-3 py-1.5 text-sm text-darkgreen focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" className="flex items-center gap-1.5">
                <Filter className="h-4 w-4" />
                Apply Filter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilter}
                className="flex items-center gap-1.5 text-darkgreen-muted hover:text-darkgreen"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </form>

          {dateError && (
            <div className="mt-3 rounded-md bg-[#FDF2F2] p-2 text-xs font-medium text-[#B42318]">
              {dateError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading & Error States */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-darkgreen-muted">Aggregating platform intelligence metrics...</p>
        </div>
      ) : error ? (
        <ErrorState
          title="Analytics Unavailable"
          message={error}
          onRetry={() => fetchAnalytics({ startDate, endDate })}
        />
      ) : (
        <>
          {/* Top Executive KPI Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Bookings & Completion Rate */}
            <Card className="border border-themeborder shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-darkgreen-muted">Total Bookings</span>
                  <div className="rounded-lg bg-palesage p-2 text-forest">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-darkgreen">{bookings?.summary?.totalBookings ?? 0}</span>
                  <span className="text-xs font-medium text-[#276749]">
                    {bookings?.summary?.completedBookings ?? 0} completed
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-darkgreen-muted mb-1">
                    <span>Completion Rate</span>
                    <span className="font-semibold text-darkgreen">{bookings?.summary?.completionRate ?? 0}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-palesage/50 overflow-hidden">
                    <div
                      className="h-full bg-forest rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(bookings?.summary?.completionRate ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Paid Revenue */}
            <Card className="border border-themeborder shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-darkgreen-muted">Paid Revenue</span>
                  <div className="rounded-lg bg-[#EAF5EE] p-2 text-[#276749]">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-darkgreen">
                    {formatCurrency(revenue?.summary?.paidRevenue ?? 0)}
                  </span>
                  <span className="text-xs text-darkgreen-muted">
                    of {formatCurrency(revenue?.summary?.totalInvoiced ?? 0)}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-darkgreen-muted mb-1">
                    <span>Collection Rate</span>
                    <span className="font-semibold text-darkgreen">{revenue?.summary?.paidRate ?? 0}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-palesage/50 overflow-hidden">
                    <div
                      className="h-full bg-forest rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(revenue?.summary?.paidRate ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dispute Resolution Rate */}
            <Card className="border border-themeborder shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-darkgreen-muted">Disputes Oversight</span>
                  <div className="rounded-lg bg-[#FFFBEB] p-2 text-[#92400E]">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-darkgreen">{disputes?.totalDisputes ?? 0}</span>
                  <span className="text-xs text-[#92400E]">
                    {disputes?.byStatus?.OPEN ?? 0} open queue
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-darkgreen-muted mb-1">
                    <span>Resolution Rate</span>
                    <span className="font-semibold text-darkgreen">{disputes?.resolutionRate ?? 0}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-palesage/50 overflow-hidden">
                    <div
                      className="h-full bg-[#92400E] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(disputes?.resolutionRate ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Resolution Rate */}
            <Card className="border border-themeborder shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-darkgreen-muted">Support Tickets</span>
                  <div className="rounded-lg bg-palesage p-2 text-forest">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-darkgreen">{support?.totalTickets ?? 0}</span>
                  <span className="text-xs text-forest-deep">
                    {support?.resolvedCount ?? 0} resolved
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-darkgreen-muted mb-1">
                    <span>Resolution Rate</span>
                    <span className="font-semibold text-darkgreen">{support?.resolutionRate ?? 0}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-palesage/50 overflow-hidden">
                    <div
                      className="h-full bg-forest rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(support?.resolutionRate ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section 1: Booking & Revenue Trends */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Booking Trends Daily Timeline */}
            <Card className="border border-themeborder shadow-xs">
              <CardHeader className="border-b border-themeborder/60 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-forest" />
                    <h2 className="text-base font-semibold text-darkgreen">Booking Trends by Date</h2>
                  </div>
                  <span className="text-xs text-darkgreen-muted">
                    Cancellation: <strong className="text-[#B42318]">{bookings?.summary?.cancellationRate ?? 0}%</strong>
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {bookings?.timeline?.length > 0 ? (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-themeborder bg-ivory text-darkgreen-muted">
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3 text-center">Total</th>
                            <th className="py-2 px-3 text-center">Completed</th>
                            <th className="py-2 px-3 text-center">Cancelled</th>
                            <th className="py-2 px-3 text-center">In Progress</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-themeborder/60">
                          {bookings.timeline.map((item) => (
                            <tr key={item.date} className="hover:bg-ivory/50">
                              <td className="py-2 px-3 font-medium text-darkgreen">{item.date}</td>
                              <td className="py-2 px-3 text-center font-bold text-darkgreen">{item.total}</td>
                              <td className="py-2 px-3 text-center text-[#276749] font-semibold">{item.completed}</td>
                              <td className="py-2 px-3 text-center text-[#B42318] font-semibold">{item.cancelled}</td>
                              <td className="py-2 px-3 text-center text-forest font-semibold">{item.inProgress}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No Booking Trends"
                    message="No booking records match the selected date range filter."
                  />
                )}
              </CardContent>
            </Card>

            {/* Revenue Trends Daily Timeline */}
            <Card className="border border-themeborder shadow-xs">
              <CardHeader className="border-b border-themeborder/60 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-[#276749]" />
                    <h2 className="text-base font-semibold text-darkgreen">Revenue & Invoicing Timeline</h2>
                  </div>
                  <span className="text-xs text-darkgreen-muted">
                    Paid Invoices: <strong className="text-[#276749]">{revenue?.summary?.paidInvoices ?? 0}</strong> / {revenue?.summary?.totalInvoices ?? 0}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {revenue?.timeline?.length > 0 ? (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-themeborder bg-ivory text-darkgreen-muted">
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3 text-right">Invoiced Amount</th>
                            <th className="py-2 px-3 text-right">Paid Revenue</th>
                            <th className="py-2 px-3 text-center">Paid Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-themeborder/60">
                          {revenue.timeline.map((item) => (
                            <tr key={item.date} className="hover:bg-ivory/50">
                              <td className="py-2 px-3 font-medium text-darkgreen">{item.date}</td>
                              <td className="py-2 px-3 text-right font-medium text-darkgreen">
                                {formatCurrency(item.totalInvoiced)}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-[#276749]">
                                {formatCurrency(item.paidRevenue)}
                              </td>
                              <td className="py-2 px-3 text-center text-darkgreen-muted">
                                {item.paidInvoices} / {item.totalInvoices}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No Revenue Activity"
                    message="No invoices generated or paid within this period."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section 2: Provider Performance & Category Demand */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Provider Performance */}
            <Card className="border border-themeborder shadow-xs">
              <CardHeader className="border-b border-themeborder/60 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-forest" />
                    <h2 className="text-base font-semibold text-darkgreen">Provider Performance Rankings</h2>
                  </div>
                  <span className="text-xs text-darkgreen-muted">Sorted by completed jobs</span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {providers?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-themeborder bg-ivory text-darkgreen-muted">
                          <th className="py-2 px-3">Provider</th>
                          <th className="py-2 px-3 text-center">Rating</th>
                          <th className="py-2 px-3 text-center">Completed</th>
                          <th className="py-2 px-3 text-center">Rate</th>
                          <th className="py-2 px-3 text-right">Paid Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-themeborder/60">
                        {providers.map((p, idx) => (
                          <tr key={p.providerId || idx} className="hover:bg-ivory/50">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-darkgreen">{p.name}</div>
                              <div className="text-[11px] text-darkgreen-muted">{p.businessName || p.email}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center gap-1 font-semibold text-[#92400E]">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {p.rating ? p.rating.toFixed(1) : 'N/A'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-darkgreen">
                              {p.completedJobs} / {p.totalJobs}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                                  p.completionRate >= 70
                                    ? 'bg-[#EAF5EE] text-[#276749]'
                                    : p.completionRate >= 40
                                    ? 'bg-[#FFFBEB] text-[#92400E]'
                                    : 'bg-ivory border border-themeborder text-darkgreen-muted'
                                }`}
                              >
                                {p.completionRate}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-[#276749]">
                              {formatCurrency(p.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="No Provider Activity"
                    message="No service jobs fulfilled by providers in the chosen date range."
                  />
                )}
              </CardContent>
            </Card>

            {/* Category Demand Rankings */}
            <Card className="border border-themeborder shadow-xs">
              <CardHeader className="border-b border-themeborder/60 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-forest" />
                    <h2 className="text-base font-semibold text-darkgreen">Service Category Demand</h2>
                  </div>
                  <span className="text-xs text-darkgreen-muted">Sorted by booking volume</span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {categories?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-themeborder bg-ivory text-darkgreen-muted">
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3 text-center">Bookings</th>
                          <th className="py-2 px-3 text-center">Requests</th>
                          <th className="py-2 px-3 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-themeborder/60">
                        {categories.map((c, idx) => (
                          <tr key={c.categoryId || idx} className="hover:bg-ivory/50">
                            <td className="py-2.5 px-3 font-semibold text-darkgreen">{c.name}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-forest">{c.bookingCount}</td>
                            <td className="py-2.5 px-3 text-center text-darkgreen-muted">{c.requestCount}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-[#276749]">
                              {formatCurrency(c.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="No Category Demand"
                    message="No booking or request activity found across service categories."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section 3: Dispute & Support Operations Oversight */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Disputes Status Breakdown */}
            <Card className="border border-themeborder shadow-xs">
              <CardHeader className="border-b border-themeborder/60 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-[#92400E]" />
                    <h2 className="text-base font-semibold text-darkgreen">Dispute Trends & SLA</h2>
                  </div>
                  <span className="text-xs font-semibold text-[#276749]">
                    Resolution: {disputes?.resolutionRate ?? 0}%
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-[#FFFBEB] p-3 text-center">
                    <span className="block text-xs font-medium text-[#92400E]">Open Queue</span>
                    <span className="text-lg font-bold text-[#92400E]">{disputes?.byStatus?.OPEN ?? 0}</span>
                  </div>
                  <div className="rounded-lg bg-palesage p-3 text-center">
                    <span className="block text-xs font-medium text-forest">Under Review</span>
                    <span className="text-lg font-bold text-forest-deep">{disputes?.byStatus?.UNDER_REVIEW ?? 0}</span>
                  </div>
                  <div className="rounded-lg bg-[#EAF5EE] p-3 text-center">
                    <span className="block text-xs font-medium text-[#276749]">Resolved</span>
                    <span className="text-lg font-bold text-[#276749]">{disputes?.byStatus?.RESOLVED ?? 0}</span>
                  </div>
                  <div className="rounded-lg bg-[#FDF2F2] p-3 text-center">
                    <span className="block text-xs font-medium text-[#B42318]">Rejected</span>
                    <span className="text-lg font-bold text-[#B42318]">{disputes?.byStatus?.REJECTED ?? 0}</span>
                  </div>
                  <div className="rounded-lg bg-ivory border border-themeborder p-3 text-center">
                    <span className="block text-xs font-medium text-darkgreen-muted">Refunds Approved</span>
                    <span className="text-lg font-bold text-darkgreen">{disputes?.refundApprovedCount ?? 0}</span>
                  </div>
                  <div className="rounded-lg bg-[#EAF5EE] p-3 text-center">
                    <span className="block text-xs font-medium text-[#276749]">Refund Total</span>
                    <span className="text-sm font-bold text-[#276749]">
                      {formatCurrency((disputes?.refundAmountTotal ?? 0) / 100)}
                    </span>
                  </div>
                </div>

                {disputes?.byCategory?.length > 0 && (
                  <div className="pt-2">
                    <h3 className="text-xs font-semibold text-darkgreen mb-2">Disputes by Category</h3>
                    <div className="flex flex-wrap gap-2">
                      {disputes.byCategory.map((catItem) => (
                        <span
                          key={catItem.category}
                          className="inline-flex items-center gap-1.5 rounded-md bg-ivory border border-themeborder px-2.5 py-1 text-xs text-darkgreen"
                        >
                          <span className="font-medium">{catItem.category}:</span>
                          <span className="font-bold">{catItem.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Support Ticket Operations Breakdown */}
            <Card className="border border-themeborder shadow-xs">
              <CardHeader className="border-b border-themeborder/60 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-forest" />
                    <h2 className="text-base font-semibold text-darkgreen">Support Ticket Operations</h2>
                  </div>
                  <span className="text-xs font-semibold text-forest">
                    Resolution: {support?.resolutionRate ?? 0}%
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-palesage p-2.5 text-center">
                    <span className="block text-xs font-medium text-forest">Open</span>
                    <span className="text-lg font-bold text-forest-deep">{support?.byStatus?.OPEN ?? 0}</span>
                  </div>
                  <div className="rounded-lg bg-palesage p-2.5 text-center">
                    <span className="block text-xs font-medium text-forest">In Progress</span>
                    <span className="text-lg font-bold text-forest-deep">{support?.byStatus?.IN_PROGRESS ?? 0}</span>
                  </div>
                  <div className="rounded-lg bg-[#EAF5EE] p-2.5 text-center">
                    <span className="block text-xs font-medium text-[#276749]">Resolved</span>
                    <span className="text-lg font-bold text-[#276749]">{support?.byStatus?.RESOLVED ?? 0}</span>
                  </div>
                  <div className="rounded-lg bg-ivory border border-themeborder p-2.5 text-center">
                    <span className="block text-xs font-medium text-darkgreen-muted">Closed</span>
                    <span className="text-lg font-bold text-darkgreen">{support?.byStatus?.CLOSED ?? 0}</span>
                  </div>
                </div>

                {/* Priority Breakdown */}
                <div className="pt-2">
                  <h3 className="text-xs font-semibold text-darkgreen mb-2">Tickets by Priority</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-md border border-themeborder p-2 text-center">
                      <span className="block text-[11px] text-darkgreen-muted">Low</span>
                      <span className="text-sm font-bold text-darkgreen">{support?.byPriority?.LOW ?? 0}</span>
                    </div>
                    <div className="rounded-md border border-sage/40 bg-palesage/40 p-2 text-center">
                      <span className="block text-[11px] text-forest">Medium</span>
                      <span className="text-sm font-bold text-forest-deep">{support?.byPriority?.MEDIUM ?? 0}</span>
                    </div>
                    <div className="rounded-md border border-[#FEE685] bg-[#FFFBEB] p-2 text-center">
                      <span className="block text-[11px] text-[#92400E]">High</span>
                      <span className="text-sm font-bold text-[#92400E]">{support?.byPriority?.HIGH ?? 0}</span>
                    </div>
                    <div className="rounded-md border border-[#F8D0D0] bg-[#FDF2F2] p-2 text-center">
                      <span className="block text-[11px] text-[#B42318]">Urgent</span>
                      <span className="text-sm font-bold text-[#B42318]">{support?.byPriority?.URGENT ?? 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboardPage;
