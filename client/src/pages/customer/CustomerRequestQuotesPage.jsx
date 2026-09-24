/**
 * Customer Request Quotes Comparison Page
 * View and compare all quotes received for a specific service request.
 * Allows customer to accept a selected quote.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
  Briefcase,
  Star,
  Award,
  RefreshCw,
  Info,
} from 'lucide-react';
import quoteService from '../../services/quote.service';
import serviceRequestService from '../../services/serviceRequest.service';
import bookingService from '../../services/booking.service';
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

const quoteBadgeVariants = {
  SUBMITTED: 'primary',
  VIEWED: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'default',
  EXPIRED: 'default',
};

export const CustomerRequestQuotesPage = () => {
  const { id } = useParams();

  const [request, setRequest] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modal / Acceptance State
  const [selectedQuoteForAccept, setSelectedQuoteForAccept] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [confirmedBookingId, setConfirmedBookingId] = useState(null);

  const fetchQuotesAndRequest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [reqRes, quotesRes] = await Promise.all([
        serviceRequestService.getServiceRequestById(id),
        quoteService.getQuotesForRequest(id),
      ]);

      setRequest(reqRes.data?.request || null);
      setQuotes(quotesRes.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load quotes for this service request');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuotesAndRequest();
  }, [fetchQuotesAndRequest]);

  const handleOpenAcceptModal = (quote) => {
    setSelectedQuoteForAccept(quote);
    setAcceptError(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = request?.preferredDate
      ? request.preferredDate.split('T')[0]
      : tomorrow.toISOString().split('T')[0];
    setScheduleDate(defaultDate);
    const dur = quote.estimatedDuration || 2;
    setStartTime('10:00');
    const endHour = 10 + Math.min(dur, 8);
    setEndTime(`${String(endHour).padStart(2, '0')}:00`);
  };

  const handleCloseAcceptModal = () => {
    setSelectedQuoteForAccept(null);
    setAcceptError(null);
  };

  const handleConfirmAccept = async () => {
    if (!selectedQuoteForAccept) return;
    if (!scheduleDate || !startTime || !endTime) {
      setAcceptError('Please select a date, start time, and end time.');
      return;
    }

    const scheduledStart = new Date(`${scheduleDate}T${startTime}:00.000Z`).toISOString();
    const scheduledEnd = new Date(`${scheduleDate}T${endTime}:00.000Z`).toISOString();

    if (new Date(scheduledStart) >= new Date(scheduledEnd)) {
      setAcceptError('End time must be after start time.');
      return;
    }
    if (new Date(scheduledStart).getTime() <= Date.now()) {
      setAcceptError('Scheduled start time must be in the future.');
      return;
    }

    setIsAccepting(true);
    setAcceptError(null);

    try {
      let res;
      try {
        res = await bookingService.acceptQuoteAndBook(id, selectedQuoteForAccept._id, {
          scheduledStart,
          scheduledEnd,
        });
      } catch (err) {
        if (err.response?.status === 409 || err.response?.status === 400 || err.response?.status === 422) {
          throw err;
        }
        if (quoteService?.acceptQuote) {
          res = await quoteService.acceptQuote(id, selectedQuoteForAccept._id);
        } else {
          throw err;
        }
      }

      const booking = res.data?.booking;
      if (booking) {
        setConfirmedBookingId(booking._id);
      }

      setSuccessMessage(
        `Quote accepted and service scheduled with ${
          selectedQuoteForAccept.providerProfile?.businessName ||
          selectedQuoteForAccept.provider?.name
        }!`
      );
      handleCloseAcceptModal();
      await fetchQuotesAndRequest();
    } catch (err) {
      setAcceptError(
        err.response?.data?.message ||
        err.message ||
        'Failed to confirm booking. Please try another time slot.'
      );
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading quotes comparison..." />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-4">
        <Link to="/customer/requests" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to My Requests
        </Link>
        <ErrorState
          title="Could Not Load Quotes"
          message={error || 'The requested service request could not be found or you do not have permission.'}
          onRetry={fetchQuotesAndRequest}
        />
      </div>
    );
  }

  const hasAcceptedQuote = quotes.some((q) => q.status === 'ACCEPTED');

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div>
        <Link
          to={`/customer/requests/${id}`}
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Request Details
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Quotes & Proposals</h1>
            <Badge variant="primary" size="sm">
              {quotes.length} {quotes.length === 1 ? 'Quote' : 'Quotes'} Received
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            For: <strong className="text-slate-700">{request.title}</strong>
          </p>
        </div>

        <Button
          variant="outline"
          icon={RefreshCw}
          onClick={fetchQuotesAndRequest}
          disabled={isLoading}
        >
          Refresh Quotes
        </Button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-emerald-800 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          {confirmedBookingId ? (
            <Link to={`/customer/bookings/${confirmedBookingId}`}>
              <Button size="sm" variant="primary">
                View Confirmed Booking
              </Button>
            </Link>
          ) : (
            <Link to="/customer/bookings">
              <Button size="sm" variant="outline">
                Go to Bookings
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Booking Status Notice when accepted */}
      {hasAcceptedQuote && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-sky-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-sky-900 leading-relaxed">
              <strong>Booking Confirmed:</strong> You have accepted a quote for this request and scheduled the appointment. Your request status is now <strong>BOOKED</strong>.
            </div>
          </div>
          <Link to="/customer/bookings">
            <Button size="sm" variant="outline">
              My Bookings
            </Button>
          </Link>
        </div>
      )}

      {/* Quotes Listing */}
      {quotes.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No quotes received yet"
          description="Verified providers in your area have been notified of your request. Competitive quotes usually arrive within a few hours."
          action={
            <Link to="/customer/requests">
              <Button variant="outline">View All Requests</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotes.map((quote) => {
            const isAccepted = quote.status === 'ACCEPTED';
            const canAccept =
              (quote.status === 'SUBMITTED' || quote.status === 'VIEWED') &&
              !hasAcceptedQuote;

            return (
              <Card
                key={quote._id}
                className={`flex flex-col justify-between transition-all ${
                  isAccepted
                    ? 'border-2 border-emerald-500 shadow-md ring-2 ring-emerald-100'
                    : 'hover:border-slate-300'
                }`}
              >
                <CardHeader
                  title={
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-base">
                          {quote.providerProfile?.businessName ||
                            quote.provider?.name ||
                            'Verified Service Professional'}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          {quote.providerProfile?.experienceYears ? (
                            <span>{quote.providerProfile.experienceYears} yrs experience</span>
                          ) : null}
                          {quote.providerProfile?.rating > 0 && (
                            <span className="flex items-center text-amber-500">
                              <Star className="h-3 w-3 fill-current mr-0.5" />
                              {quote.providerProfile.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={quoteBadgeVariants[quote.status] || 'default'} size="sm">
                        {quote.status}
                      </Badge>
                    </div>
                  }
                />

                <CardContent className="space-y-4 flex-1">
                  {/* Pricing and Duration Highlight */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Estimated Cost
                      </span>
                      <div className="text-2xl font-black text-slate-900">
                        ₹{quote.amount?.toLocaleString('en-IN') || quote.pricing?.totalAmount}
                      </div>
                      <span className="text-[10px] text-slate-400">Total estimated INR</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Est. Duration
                      </span>
                      <div className="text-lg font-bold text-slate-700 flex items-center justify-end gap-1">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span>{quote.estimatedDuration || quote.estimatedHours || 1} hrs</span>
                      </div>
                    </div>
                  </div>

                  {/* Scope / Notes */}
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Proposal Details
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed bg-white border border-slate-100 rounded-lg p-3">
                      {quote.description}
                    </p>
                  </div>

                  {/* Skills badge */}
                  {quote.providerProfile?.skills && quote.providerProfile.skills.length > 0 && (
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                        Provider Skills
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {quote.providerProfile.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700"
                          >
                            <Tag className="h-2.5 w-2.5 mr-1 text-slate-400" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Validity Info */}
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-100">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Valid until:{' '}
                      {quote.validUntil
                        ? new Date(quote.validUntil).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </CardContent>

                {/* Footer Action */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 rounded-b-2xl">
                  {isAccepted ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 py-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Selected Proposal
                    </div>
                  ) : canAccept ? (
                    <Button
                      className="w-full"
                      icon={Award}
                      onClick={() => handleOpenAcceptModal(quote)}
                    >
                      Accept This Quote
                    </Button>
                  ) : (
                    <div className="text-center text-xs text-slate-400 py-1.5">
                      {hasAcceptedQuote
                        ? 'Another quote was selected'
                        : `Proposal ${quote.status.toLowerCase()}`}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={Boolean(selectedQuoteForAccept)}
        onClose={handleCloseAcceptModal}
        title="Accept Service Quote"
        description="Select your service appointment time slot and confirm the booking."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" onClick={handleCloseAcceptModal} disabled={isAccepting}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAccept} isLoading={isAccepting}>
              Confirm Acceptance
            </Button>
          </div>
        }
      >
        {selectedQuoteForAccept && (
          <div className="space-y-4 py-2">
            {acceptError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{acceptError}</span>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Provider:</span>
                <span className="font-semibold text-slate-900">
                  {selectedQuoteForAccept.providerProfile?.businessName ||
                    selectedQuoteForAccept.provider?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Agreed Price:</span>
                <span className="font-bold text-slate-900 text-sm">
                  ₹{selectedQuoteForAccept.amount?.toLocaleString('en-IN') || selectedQuoteForAccept.pricing?.totalAmount} INR
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated Duration:</span>
                <span className="font-semibold text-slate-900">
                  {selectedQuoteForAccept.estimatedDuration || selectedQuoteForAccept.estimatedHours} hours
                </span>
              </div>
            </div>

            {/* Schedule Slot Selection */}
            <div className="space-y-3 border-t border-slate-200 pt-3">
              <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-600" /> Appointment Schedule
              </h4>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Service Date
                </label>
                <input
                  type="date"
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={scheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Start Time (UTC)
                  </label>
                  <input
                    type="time"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    End Time (UTC)
                  </label>
                  <input
                    type="time"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-normal">
                Double-booking prevention is enforced. The selected slot must fit completely within the provider’s recurring working shift.
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
              By confirming, this quote will be marked <strong>ACCEPTED</strong>, a confirmed booking will be created, and all other active quotes for this request will be automatically rejected.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerRequestQuotesPage;
