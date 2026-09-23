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
  AlertCircle,
  Wrench,
  Sparkles,
  Zap,
  Droplets,
  Hammer,
  ClipboardList,
} from 'lucide-react';
import serviceRequestService from '../../services/serviceRequest.service';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  LoadingSpinner,
  EmptyState,
  ErrorState,
} from '../../components/ui';

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

const formatPricingUnit = (unit, price) => {
  if (price === undefined || price === null) return 'N/A';
  switch (unit) {
    case 'FIXED':
      return `$${price} (Fixed price)`;
    case 'HOURLY':
      return `$${price} / hour`;
    case 'STARTING_FROM':
      return `Starting at $${price}`;
    case 'QUOTE_REQUIRED':
      return 'Custom quote required';
    default:
      return `$${price}`;
  }
};

export const RequestDetailPage = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
            <Link to="/customer/requests/new">
              <Button size="sm">Create Another Request</Button>
            </Link>
          </div>
        </div>
      </div>

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

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-800 flex items-start">
                <AlertCircle className="h-4 w-4 mr-1.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Provider matching and quote bidding will be enabled in upcoming milestones. You will receive notification as soon as matching begins.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailPage;
