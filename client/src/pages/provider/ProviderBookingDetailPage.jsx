/**
 * Provider Booking Detail Page
 * View full assigned service job details, revealed customer street address
 * for execution, customer contact info, agreed pricing, and cancellation actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Briefcase,
  User,
  Phone,
  Mail,
  RefreshCw,
} from 'lucide-react';
import bookingService from '../../services/booking.service';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Modal,
  LoadingSpinner,
  ErrorState,
} from '../../components/ui';

const statusBadgeVariants = {
  CONFIRMED: 'success',
  IN_PROGRESS: 'primary',
  COMPLETED: 'default',
  CANCELLED: 'danger',
};

export const ProviderBookingDetailPage = () => {
  const { id } = useParams();

  const [booking, setBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const fetchBooking = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingService.getProviderBookingById(id);
      setBooking(res.data?.booking || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleConfirmCancel = async () => {
    if (!cancellationReason.trim() || cancellationReason.trim().length < 5) {
      setCancelError('Please enter a cancellation reason of at least 5 characters.');
      return;
    }

    setIsCancelling(true);
    setCancelError(null);
    try {
      await bookingService.cancelProviderBooking(id, {
        reason: cancellationReason.trim(),
      });
      setSuccessMessage('Job booking cancelled successfully.');
      setIsCancelModalOpen(false);
      setCancellationReason('');
      await fetchBooking();
    } catch (err) {
      setCancelError(
        err.response?.data?.message || err.message || 'Failed to cancel job booking.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC';
  };

  if (isLoading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading scheduled job details..." />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <Link
          to="/provider/bookings"
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Scheduled Jobs
        </Link>
        <ErrorState
          title="Job Booking Not Found"
          message={error || 'The requested booking could not be loaded.'}
          onRetry={fetchBooking}
        />
      </div>
    );
  }

  const canCancel = booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button */}
      <div>
        <Link
          to="/provider/bookings"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Scheduled Jobs
        </Link>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">
              {booking.serviceRequest?.title || 'Scheduled Service Job'}
            </h1>
            <Badge variant={statusBadgeVariants[booking.status] || 'default'}>
              {booking.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Booking ID: <span className="font-mono text-slate-700">{booking._id}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={fetchBooking}
            disabled={isLoading}
          >
            Refresh
          </Button>
          {canCancel && (
            <Button
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              icon={XCircle}
              onClick={() => {
                setCancellationReason('');
                setCancelError(null);
                setIsCancelModalOpen(true);
              }}
            >
              Cancel Job
            </Button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Cancellation Notice Banner */}
      {booking.status === 'CANCELLED' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-rose-900">
            <div className="font-semibold text-sm text-rose-800">Job Booking Cancelled</div>
            <div>
              <strong>Cancelled At:</strong> {formatDateTime(booking.cancellation?.cancelledAt || booking.cancelledAt)}
            </div>
            <div>
              <strong>Cancelled By:</strong> {booking.cancellation?.cancelledBy || booking.cancelledBy}
            </div>
            <div>
              <strong>Reason:</strong> {booking.cancellation?.cancellationReason || booking.cancellationReason || 'No reason specified'}
            </div>
          </div>
        </div>
      )}

      {/* Grid: Job Details & Client Location */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Schedule & Service Specs (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          {/* Appointment Timing Card */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" /> Appointment Schedule Window
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">Start Window (UTC)</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {formatDateTime(booking.scheduledStart)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase font-semibold">End Window (UTC)</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {formatDateTime(booking.scheduledEnd)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-600">Agreed Job Payout:</span>
                <span className="text-lg font-bold text-slate-900">
                  ₹{(booking.price || 0).toLocaleString('en-IN')} {booking.currency || 'INR'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Job Specifications Card */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" /> Work Description
              </h2>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                {booking.serviceRequest?.description || 'No work description specified.'}
              </p>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500 font-medium">Service Category:</span>
                <Badge variant="primary" size="sm">
                  {booking.serviceRequest?.category?.name || 'Home Service'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customer & Location Card */}
        <div className="space-y-6">
          <Card className="border-t-4 border-t-emerald-600">
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-600" /> Service Location
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-900">
                <span className="font-semibold block mb-0.5">Address Unlocked</span>
                <span>The client&apos;s full address is revealed for service execution.</span>
              </div>

              <div className="space-y-2 text-xs text-slate-800">
                <div className="font-medium text-slate-900 text-sm">
                  {booking.serviceRequest?.location?.address || 'Street Address Available'}
                </div>
                <div className="text-slate-600">
                  {booking.serviceRequest?.location?.city || ''}
                  {booking.serviceRequest?.location?.postalCode ? ` - ${booking.serviceRequest.location.postalCode}` : ''}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-700">
                <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">
                  Client Contact
                </span>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-900">{booking.customer?.name}</span>
                </div>
                {booking.customer?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{booking.customer.email}</span>
                  </div>
                )}
                {booking.customer?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{booking.customer.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancellation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Job Booking"
        description="Are you sure you want to cancel this assigned job? A reason is mandatory."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isCancelling}
            >
              Keep Job
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
        <div className="space-y-4 py-2">
          {cancelError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{cancelError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows="3"
              className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Why are you cancelling this job (minimum 5 characters)..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              required
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Cancelling this job will notify the customer and allow them to choose another provider.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ProviderBookingDetailPage;
