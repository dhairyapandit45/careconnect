/**
 * Provider Submit Quote Page
 * Form for submitting an official quote on an eligible customer service request.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Send,
  MapPin,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import quoteService from '../../services/quote.service';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Input,
  LoadingSpinner,
  ErrorState,
} from '../../components/ui';

export const ProviderSubmitQuotePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Form State
  const defaultValidUntil = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    amount: '',
    estimatedDuration: '',
    description: '',
    validUntil: defaultValidUntil(),
  });

  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchRequestDetails = useCallback(async () => {
    setIsLoadingRequest(true);
    setLoadError(null);
    try {
      const res = await quoteService.getEligibleRequestById(id);
      setRequest(res.data?.request || null);
    } catch (err) {
      setLoadError(err.message || 'Unable to load service request details');
    } finally {
      setIsLoadingRequest(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const numAmount = parseFloat(formData.amount);
    const numDuration = parseFloat(formData.estimatedDuration);

    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Quote amount must be a positive number greater than 0.');
      return;
    }

    if (isNaN(numDuration) || numDuration <= 0) {
      setFormError('Estimated duration must be greater than 0 hours.');
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 10) {
      setFormError('Please provide a detailed description (minimum 10 characters) explaining your scope of work.');
      return;
    }

    const validity = new Date(formData.validUntil);
    if (isNaN(validity.getTime()) || validity <= new Date()) {
      setFormError('Quote validity date must be in the future.');
      return;
    }

    setIsSubmitting(true);
    try {
      await quoteService.createQuote(id, {
        amount: numAmount,
        currency: 'INR',
        estimatedDuration: numDuration,
        description: formData.description.trim(),
        validUntil: validity.toISOString(),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/provider/quotes', {
          state: { message: 'Quote submitted successfully!' },
        });
      }, 1500);
    } catch (err) {
      if (err.response?.data?.error?.code === 'DUPLICATE_ACTIVE_QUOTE') {
        setFormError('You have already submitted an active quote for this service request.');
      } else {
        setFormError(err.message || 'Failed to submit quote. Please check requirements.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingRequest) {
    return (
      <div className="py-20 flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading service request information..." />
      </div>
    );
  }

  if (loadError || !request) {
    return (
      <div className="space-y-4">
        <Link to="/provider/requests" className="inline-flex items-center text-xs text-darkgreen-muted hover:text-darkgreen">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Available Requests
        </Link>
        <ErrorState
          title="Request Not Found or Ineligible"
          message={loadError || 'This service request is no longer available or outside your approved trade territory.'}
          onRetry={fetchRequestDetails}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/provider/requests"
          className="inline-flex items-center text-xs font-medium text-darkgreen-muted hover:text-darkgreen transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Available Requests
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-darkgreen">Prepare & Submit Quote</h1>
        <p className="text-sm text-darkgreen-muted mt-1">
          Provide a transparent, competitive estimate. Customers evaluate price, duration, and scope.
        </p>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-sm text-emerald-800 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>Quote submitted successfully! Redirecting to your submitted quotes...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Recap Card */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader
              title="Job Summary"
              subtitle="Customer request specifications"
            />
            <CardContent className="space-y-4 text-xs">
              <div>
                <Badge variant="primary" size="sm" className="mb-2">
                  {request.category?.name || 'Category'}
                </Badge>
                <h3 className="font-semibold text-darkgreen text-sm">
                  {request.title}
                </h3>
              </div>

              <div className="bg-ivory/60 rounded-xl p-3 text-darkgreen leading-relaxed border border-themeborder">
                {request.description}
              </div>

              <div className="space-y-2 pt-2 border-t border-themeborder text-darkgreen-muted">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-darkgreen-muted" />
                  <span>{request.location?.city}, {request.location?.state} ({request.location?.postalCode})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-darkgreen-muted" />
                  <span>Target Date: {new Date(request.preferredDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-darkgreen-muted" />
                  <span>
                    Timing: {request.preferredTime?.start || '09:00'} – {request.preferredTime?.end || '17:00'}
                  </span>
                </div>
              </div>

              {request.requiredSkills && request.requiredSkills.length > 0 && (
                <div className="pt-2 border-t border-themeborder">
                  <span className="text-[11px] font-semibold text-darkgreen-muted uppercase block mb-1.5">
                    Required Skills
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {request.requiredSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-palesage/60 text-darkgreen border border-sage/30"
                      >
                        <Tag className="h-2.5 w-2.5 mr-1 text-darkgreen-muted" />
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              Quotes are legally binding estimates until their expiration date. You can withdraw your quote at any time before the customer accepts it.
            </span>
          </div>
        </div>

        {/* Quote Form Card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Official Quote Details"
              subtitle="Specify your pricing, estimated hours, and project breakdown"
            />
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {formError && (
                  <div className="bg-status-error/10 border border-status-error/20 rounded-xl p-4 flex items-start gap-3 text-xs text-status-error">
                    <AlertCircle className="h-5 w-5 text-status-error flex-shrink-0 mt-0.5" />
                    <div>{formError}</div>
                  </div>
                )}

                {/* Amount and Duration Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-darkgreen mb-1.5">
                      Estimated Cost (₹ INR) <span className="text-status-error">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        name="amount"
                        step="0.01"
                        min="1"
                        placeholder="e.g. 1500"
                        value={formData.amount}
                        onChange={handleChange}
                        className="pl-8"
                        required
                      />
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-darkgreen-muted pointer-events-none">
                        ₹
                      </span>
                    </div>
                    <span className="text-[11px] text-darkgreen-muted mt-1 block">
                      Platform standard currency: INR
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-darkgreen mb-1.5">
                      Estimated Duration (Hours) <span className="text-status-error">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        name="estimatedDuration"
                        step="0.5"
                        min="0.5"
                        placeholder="e.g. 2.5"
                        value={formData.estimatedDuration}
                        onChange={handleChange}
                        className="pl-8"
                        required
                      />
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-darkgreen-muted pointer-events-none" />
                    </div>
                    <span className="text-[11px] text-darkgreen-muted mt-1 block">
                      Estimated time on-site to finish job
                    </span>
                  </div>
                </div>

                {/* Scope & Description */}
                <div>
                  <label className="block text-xs font-semibold text-darkgreen mb-1.5">
                    Proposal Scope & Description <span className="text-status-error">*</span>
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="Describe how you will address the problem, materials included, warranty, and any assumptions..."
                    value={formData.description}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-themeborder p-3 text-xs text-darkgreen placeholder-darkgreen-muted/60 focus:outline-none focus:ring-2 focus:ring-forest focus:border-forest transition-all"
                  />
                  <span className="text-[11px] text-darkgreen-muted mt-1 block">
                    Minimum 10 characters. A thorough proposal increases acceptance rates.
                  </span>
                </div>

                {/* Validity Date */}
                <div>
                  <label className="block text-xs font-semibold text-darkgreen mb-1.5">
                    Quote Valid Until <span className="text-status-error">*</span>
                  </label>
                  <Input
                    type="date"
                    name="validUntil"
                    value={formData.validUntil}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <span className="text-[11px] text-darkgreen-muted mt-1 block">
                    After this date, the quote will automatically expire if not accepted.
                  </span>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-themeborder flex items-center justify-end gap-3">
                  <Link to="/provider/requests">
                    <Button variant="outline" type="button" disabled={isSubmitting}>
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    icon={Send}
                    isLoading={isSubmitting}
                    disabled={success}
                  >
                    Submit Official Quote
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProviderSubmitQuotePage;
