/**
 * Customer Service Request Detail Page
 * Displays full request details, category info, service schedule, location, and workflow status.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Tag,
  CheckCircle2,
  Wrench,
  Sparkles,
  Zap,
  Droplets,
  Hammer,
  ClipboardList,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import serviceRequestService from '../../services/serviceRequest.service';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Modal,
  LoadingSpinner,
  EmptyState,
  ErrorState,
} from '../../components/ui';
import { formatPricingUnit } from '../../utils/currency';

const iconMap = {
  Wrench,
  Sparkles,
  Zap,
  Droplets,
  Hammer,
};

const statusBadgeVariants = {
  DRAFT: 'default',
  SUBMITTED: 'primary',
  MATCHING: 'warning',
  QUOTING: 'warning',
  PROVIDER_SELECTED: 'primary',
  BOOKED: 'success',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  DISPUTED: 'danger',
};

export const RequestDetailPage = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const fetchRequest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await serviceRequestService.getServiceRequestById(id);
      setRequest(res.data?.request || null);
    } catch (err) {
      setError(err.message || 'Failed to load request details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const handleOpenCancelModal = () => {
    setIsCancelModalOpen(true);
    setCancellationReason('');
    setCancelError(null);
  };

  const handleCloseCancelModal = () => {
    setIsCancelModalOpen(false);
    setCancellationReason('');
    setCancelError(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancellationReason.trim() || cancellationReason.trim().length < 5) {
      setCancelError('Please provide a cancellation reason of at least 5 characters.');
      return;
    }

    setIsCancelling(true);
    setCancelError(null);
    try {
      await serviceRequestService.cancelServiceRequest(id, {
        reason: cancellationReason.trim(),
      });
      setSuccessMessage('Service request cancelled successfully.');
      setIsCancelModalOpen(false);
      setCancellationReason('');
      await fetchRequest();
    } catch (err) {
      setCancelError(
        err.response?.data?.message ||
        err.message ||
        'Failed to cancel service request. Please try again.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading service request details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <ErrorState message={error} onRetry={fetchRequest} />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="py-8">
        <EmptyState
          icon={ClipboardList}
          title="Request Not Found"
          message="We couldn't locate this service request. It may have been deleted or you may not have permission to view it."
          actionText="Back to Requests"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  const category = request.category || {};
  const CategoryIcon = iconMap[category.icon] || Wrench;
  const statusVariant = statusBadgeVariants[request.status] || 'default';
  const isCancellable = ['SUBMITTED', 'MATCHING', 'QUOTING', 'PROVIDER_SELECTED'].includes(request.status);
  const isBooked = request.status === 'BOOKED';
  const isCancelled = request.status === 'CANCELLED';

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div>
        <Link
          to="/customer/requests"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to My Requests
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{request.title}</h1>
              <Badge variant={statusVariant}>{request.status}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Reference: <span className="font-mono text-slate-600">REQ-{request._id?.substring(request._id.length - 8).toUpperCase()}</span> &bull; Submitted on {new Date(request.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isBooked && (
              <Link to={request.bookingId ? `/customer/bookings/${request.bookingId}` : '/customer/bookings'}>
                <Button size="sm" variant="primary">
                  View Booking
                </Button>
              </Link>
            )}
            {isCancellable && (
              <Button
                size="sm"
                variant="outline"
                className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                onClick={handleOpenCancelModal}
              >
                Cancel Request
              </Button>
            )}
            {!isCancelled && (
              <Link to={`/customer/requests/${request._id}/quotes`}>
                <Button size="sm" variant={request.quoteCount > 0 ? 'primary' : 'outline'}>
                  View Quotes ({request.quoteCount || 0})
                </Button>
              </Link>
            )}
            <Link to="/customer/requests/new">
              <Button size="sm" variant="outline">Create Another Request</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 leading-relaxed">
            <strong>Service Request Cancelled:</strong> This service request has been cancelled
            {request.cancelledAt ? ` on ${new Date(request.cancelledAt).toLocaleDateString()}` : ''}.
            {request.cancellationReason && (
              <span className="block mt-1 text-rose-700">
                Reason: <em>&ldquo;{request.cancellationReason}&rdquo;</em>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="text-xs text-emerald-800 font-medium">{successMessage}</div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Problem Details */}
          <Card>
            <CardHeader
              title="Problem Description"
              subtitle="Detailed description of the service needed"
            />
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                {request.description}
              </div>

              {request.requiredSkills && request.requiredSkills.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center">
                    <Tag className="h-3.5 w-3.5 mr-1" /> Required Capabilities & Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {request.requiredSkills.map((skill, idx) => (
                      <Badge key={idx} variant="default">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location & Preferred Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Service Location */}
            <Card>
              <CardHeader
                title="Service Location"
                icon={MapPin}
              />
              <CardContent className="space-y-2 text-sm text-slate-700">
                <div className="font-medium text-slate-900">{request.location?.address}</div>
                <div>
                  {request.location?.city}
                  {request.location?.state ? `, ${request.location.state}` : ''}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Postal Code: {request.location?.postalCode}
                </div>
              </CardContent>
            </Card>

            {/* Schedule Preference */}
            <Card>
              <CardHeader
                title="Preferred Schedule"
                icon={Calendar}
              />
              <CardContent className="space-y-3 text-sm text-slate-700">
                <div className="flex items-center text-slate-900 font-medium">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600 shrink-0" />
                  {request.preferredDate ? new Date(request.preferredDate).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) : 'Not specified'}
                </div>

                <div className="flex items-center text-slate-600">
                  <Clock className="h-4 w-4 mr-2 text-amber-600 shrink-0" />
                  Window: {request.preferredTime?.start || '09:00'} - {request.preferredTime?.end || '12:00'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Summary (Right 1 Column) */}
        <div className="space-y-6">
          {/* Category Card */}
          <Card>
            <CardHeader title="Selected Category" />
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <CategoryIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{category.name || 'Unassigned Category'}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{category.description}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium uppercase">Typical Rate</span>
                <span className="font-semibold text-slate-900">
                  {formatPricingUnit(category.pricingUnit, category.startingPrice)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Status Timeline */}
          <Card>
            <CardHeader
              title="Request Lifecycle"
              subtitle="Current operational progression"
            />
            <CardContent className="space-y-4">
              <ol className="relative border-l border-slate-200 ml-2 space-y-4 text-xs">
                {/* Step 1 */}
                <li className="ml-4">
                  <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white text-white">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  <h4 className="font-semibold text-slate-900">Request Submitted</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Your request was recorded and is awaiting provider matching.
                  </p>
                </li>

                {/* Step 2 */}
                <li className="ml-4">
                  <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 ring-4 ring-white text-white">
                    <Clock className="h-2.5 w-2.5" />
                  </span>
                  <h4 className="font-medium text-slate-500">Provider Matching</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Matching qualified service providers in your service zone.
                  </p>
                </li>

                {/* Step 3 */}
                <li className="ml-4">
                  <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 ring-4 ring-white text-white">
                    <Clock className="h-2.5 w-2.5" />
                  </span>
                  <h4 className="font-medium text-slate-500">Quotes & Estimates</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Compare provider bids, verify credentials, and select your provider.
                  </p>
                </li>

                {/* Step 4 */}
                <li className="ml-4">
                  <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 ring-4 ring-white text-white">
                    <Clock className="h-2.5 w-2.5" />
                  </span>
                  <h4 className="font-medium text-slate-500">Service Completion</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Work completion, invoice payment, and service review.
                  </p>
                </li>
              </ol>

              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-[11px] text-emerald-800 flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Provider quotes are active! Compare proposals, evaluate estimated pricing and duration, and select your preferred provider.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Service Request Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={handleCloseCancelModal}
        title="Cancel Service Request"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Are you sure you want to cancel this request? Any active provider proposals or quotes will be withdrawn.
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Please explain why you need to cancel this request (at least 5 characters)..."
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>

          {cancelError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{cancelError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseCancelModal}
              disabled={isCancelling}
            >
              Keep Request
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RequestDetailPage;
