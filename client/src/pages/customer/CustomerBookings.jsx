/**
 * Customer Bookings List Page
 * Displays confirmed home service appointments, scheduling details, and status filters.
 * Allows customers to view booking details and cancel active appointments.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Eye,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Filter,
  RefreshCw,
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

export const CustomerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
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

      const res = await bookingService.getCustomerBookings(params);
      setBookings(res.data?.items || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load bookings');
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
      await bookingService.cancelCustomerBooking(cancellingBooking._id, {
        reason: cancellationReason.trim(),
      });
      setSuccessMessage('Booking cancelled successfully.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-sm text-slate-500">
            Manage your confirmed home service appointments and scheduled visits
          </p>
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

      {/* Success Banner */}
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
          { label: 'All Bookings', value: '' },
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
          <LoadingSpinner size="lg" label="Loading your bookings..." />
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
          title="No Bookings Found"
          message={
            statusFilter
              ? `No ${statusFilter.toLowerCase().replace('_', ' ')} bookings found.`
              : 'You have not booked any services yet. Accept a quote from your requests to schedule an appointment.'
          }
          action={
            <Link to="/customer/requests">
              <Button variant="primary">View My Requests</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {pagination.total} Total {pagination.total === 1 ? 'Booking' : 'Bookings'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service / Request</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Scheduled Slot</TableHead>
                  <TableHead>Price</TableHead>
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
                          <div className="font-medium text-slate-900 text-sm">
                            {b.serviceRequest?.title || 'Service Request'}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {b.serviceRequest?.location?.city || 'Scheduled Visit'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-800">
                          {b.providerProfile?.businessName || b.provider?.name || 'Verified Provider'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {b.provider?.phone || b.provider?.email || ''}
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
                          <Link to={`/customer/bookings/${b._id}`}>
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
        title="Cancel Booking"
        description="Please confirm your cancellation and provide a mandatory reason."
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
                <strong>Service:</strong> {cancellingBooking.serviceRequest?.title || 'Home Service'}
              </div>
              <div>
                <strong>Scheduled:</strong> {formatSchedule(cancellingBooking.scheduledStart, cancellingBooking.scheduledEnd)}
              </div>
              <div>
                <strong>Provider:</strong> {cancellingBooking.providerProfile?.businessName || cancellingBooking.provider?.name}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cancellation Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows="3"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Explain why you need to cancel this appointment (minimum 5 characters)..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                required
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              Cancelling will immediately release this time slot on the provider’s calendar.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerBookings;
