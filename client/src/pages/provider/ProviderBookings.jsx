/**
 * Provider Bookings List & Agenda Page
 * Displays confirmed customer appointments assigned to the authenticated provider.
 * Supports Table list view and Chronological Agenda view with status filters.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Eye,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Filter,
  List,
  CalendarDays,
  RefreshCw,
  User,
} from 'lucide-react';
import bookingService from '../../services/booking.service';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  LoadingSpinner,
  EmptyState,
  ErrorState,
} from '../../components/ui';

const statusBadgeVariants = {
  CONFIRMED: 'success',
  IN_PROGRESS: 'primary',
  COMPLETED: 'default',
  CANCELLED: 'danger',
};

export const ProviderBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'agenda'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Cancellation Modal State
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const fetchBookings = useCallback(async (page = 1, status = statusFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (status) params.status = status;

      const res = await bookingService.getProviderBookings(params);
      setBookings(res.data?.items || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load assigned bookings');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings(1, statusFilter);
  }, [fetchBookings, statusFilter]);

  const handleOpenCancelModal = (booking) => {
    setCancellingBooking(booking);
    setCancellationReason('');
    setCancelError(null);
  };

  const handleCloseCancelModal = () => {
    setCancellingBooking(null);
    setCancellationReason('');
    setCancelError(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    if (!cancellationReason.trim() || cancellationReason.trim().length < 5) {
      setCancelError('Please provide a valid cancellation reason (at least 5 characters).');
      return;
    }

    setIsCancelling(true);
    setCancelError(null);
    try {
      await bookingService.cancelProviderBooking(cancellingBooking._id, {
        reason: cancellationReason.trim(),
      });
      setSuccessMessage('Job booking cancelled successfully.');
      handleCloseCancelModal();
      await fetchBookings(pagination.page, statusFilter);
    } catch (err) {
      setCancelError(
        err.response?.data?.message || err.message || 'Failed to cancel booking. Please try again.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const formatSchedule = (start, end) => {
    if (!start || !end) return 'TBD';
    const s = new Date(start);
    const e = new Date(end);
    const dateStr = s.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
    const startTime = s.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    const endTime = e.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    return `${dateStr}, ${startTime} - ${endTime} UTC`;
  };

  // Group bookings by Date string for Agenda view
  const groupedAgenda = bookings.reduce((acc, b) => {
    const d = b.scheduledStart
      ? new Date(b.scheduledStart).toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        })
      : 'Unscheduled';
    if (!acc[d]) acc[d] = [];
    acc[d].push(b);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scheduled Service Jobs</h1>
          <p className="text-sm text-slate-500">
            Confirmed customer appointments, service execution dates, and location details
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table List View"
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Agenda / Calendar View"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Agenda</span>
            </button>
          </div>

          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => fetchBookings(pagination.page, statusFilter)}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-sm text-emerald-800 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 text-sm">
        <Filter className="h-4 w-4 text-slate-400 mr-1" />
        {[
          { label: 'All Jobs', value: '' },
          { label: 'Confirmed', value: 'CONFIRMED' },
          { label: 'In Progress', value: 'IN_PROGRESS' },
          { label: 'Completed', value: 'COMPLETED' },
          { label: 'Cancelled', value: 'CANCELLED' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              statusFilter === tab.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-20 flex items-center justify-center">
          <LoadingSpinner size="lg" label="Loading scheduled bookings..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Could Not Load Bookings"
          message={error}
          onRetry={() => fetchBookings(pagination.page, statusFilter)}
        />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Scheduled Jobs"
          message={
            statusFilter
              ? `No ${statusFilter.toLowerCase().replace('_', ' ')} bookings found.`
              : 'You have no scheduled bookings at this time. Submit quotes on customer requests to win bookings.'
          }
          action={
            <Link to="/provider/requests">
              <Button variant="primary">Browse Customer Requests</Button>
            </Link>
          }
        />
      ) : viewMode === 'list' ? (
        /* List / Table View */
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {pagination.total} Total {pagination.total === 1 ? 'Job' : 'Jobs'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer & Service</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Scheduled Window</TableHead>
                  <TableHead>Agreed Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => {
                  const canCancel = b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS';
                  return (
                    <TableRow key={b._id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900 text-sm">
                            {b.serviceRequest?.title || 'Home Service'}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <User className="h-3 w-3 text-slate-400" />
                            {b.customer?.name || 'Customer'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-800 flex items-start gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                          <span>
                            {b.serviceRequest?.location?.address || b.serviceRequest?.location?.city || 'Location available in details'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-700 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                          <span>{formatSchedule(b.scheduledStart, b.scheduledEnd)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-sm">
                          ₹{(b.price || 0).toLocaleString('en-IN')} INR
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariants[b.status] || 'default'}>
                          {b.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/provider/bookings/${b._id}`}>
                            <Button size="sm" variant="ghost" icon={Eye}>
                              Details
                            </Button>
                          </Link>
                          {canCancel && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              icon={XCircle}
                              onClick={() => handleOpenCancelModal(b)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Agenda / Calendar Grouped View */
        <div className="space-y-6">
          {Object.entries(groupedAgenda).map(([dateLabel, dateBookings]) => (
            <div key={dateLabel} className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <span>{dateLabel}</span>
                <span className="text-slate-400 font-normal">({dateBookings.length} {dateBookings.length === 1 ? 'appointment' : 'appointments'})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dateBookings.map((b) => {
                  const canCancel = b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS';
                  return (
                    <Card key={b._id} className="border-l-4 border-l-blue-600">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {b.serviceRequest?.title || 'Service Job'}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <User className="h-3 w-3 text-slate-400" />
                              Client: {b.customer?.name}
                            </div>
                          </div>
                          <Badge variant={statusBadgeVariants[b.status] || 'default'}>
                            {b.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-2.5 space-y-1.5 text-xs text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                            <span>{formatSchedule(b.scheduledStart, b.scheduledEnd)}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                            <span>
                              {b.serviceRequest?.location?.address
                                ? `${b.serviceRequest.location.address}, ${b.serviceRequest.location.city || ''}`
                                : b.serviceRequest?.location?.city || 'Location in details'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="font-bold text-slate-900 text-sm">
                            ₹{(b.price || 0).toLocaleString('en-IN')} INR
                          </span>
                          <div className="flex items-center gap-2">
                            <Link to={`/provider/bookings/${b._id}`}>
                              <Button size="sm" variant="outline">
                                View Job
                              </Button>
                            </Link>
                            {canCancel && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                onClick={() => handleOpenCancelModal(b)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
          <div>
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => fetchBookings(pagination.page - 1, statusFilter)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => fetchBookings(pagination.page + 1, statusFilter)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      <Modal
        isOpen={Boolean(cancellingBooking)}
        onClose={handleCloseCancelModal}
        title="Cancel Job Booking"
        description="Cancelling an accepted booking requires a clear explanation for the customer and operations team."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" onClick={handleCloseCancelModal} disabled={isCancelling}>
              Keep Booking
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              isLoading={isCancelling}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Cancellation
            </Button>
          </div>
        }
      >
        {cancellingBooking && (
          <div className="space-y-4 py-2">
            {cancelError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1.5 text-slate-700">
              <div>
                <strong>Job:</strong> {cancellingBooking.serviceRequest?.title || 'Service Job'}
              </div>
              <div>
                <strong>Scheduled:</strong> {formatSchedule(cancellingBooking.scheduledStart, cancellingBooking.scheduledEnd)}
              </div>
              <div>
                <strong>Customer:</strong> {cancellingBooking.customer?.name}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows="3"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Explain why you cannot perform this service appointment (minimum 5 characters)..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                required
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              Cancelling releases this slot and allows the customer to reschedule or choose an alternative provider.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProviderBookings;
