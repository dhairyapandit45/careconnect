/**
 * Provider Requests Discovery Page
 * Displays open service requests that match the provider's verified trade categories and service areas.
 * Privacy invariant: Customer street address and personal contact details are completely sanitized.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Calendar,
  Clock,
  MapPin,
  Send,
  Search,
  RefreshCw,
  Tag,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import quoteService from '../../services/quote.service';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  LoadingSpinner,
  EmptyState,
  ErrorState,
} from '../../components/ui';

export const ProviderRequests = () => {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEligibleRequests = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await quoteService.getEligibleRequests({ page, limit: 10 });
      setRequests(res.data?.items || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load eligible service requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEligibleRequests(1);
  }, [fetchEligibleRequests]);

  // Filter requests locally by search term
  const filteredRequests = requests.filter((req) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = req.title?.toLowerCase().includes(query);
    const categoryMatch = req.category?.name?.toLowerCase().includes(query);
    const cityMatch = req.location?.city?.toLowerCase().includes(query);
    return titleMatch || categoryMatch || cityMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Available Service Requests</h1>
          <p className="text-sm text-slate-500 mt-1">
            Open jobs matched directly to your verified trade categories and service cities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => fetchEligibleRequests(pagination.page)}
            disabled={isLoading}
          >
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Trust & Privacy Notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <strong>Privacy Protected Job Feed:</strong> Customer street addresses and contact information
          are withheld during discovery. Exact location details and access instructions are securely
          released only after a customer accepts your submitted quote.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Input
            placeholder="Search by title, category, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        <span className="text-xs text-slate-500">
          Showing {filteredRequests.length} of {pagination.total} opportunities
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="min-h-[350px] flex items-center justify-center">
          <LoadingSpinner size="lg" label="Scanning for eligible service requests..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load job feed"
          message={error}
          onRetry={() => fetchEligibleRequests(pagination.page)}
        />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No eligible service requests right now"
          description={
            searchQuery
              ? `No requests match "${searchQuery}". Try clearing your search.`
              : 'There are currently no new open requests matching your trade categories and service areas. Ensure your profile categories, service cities, and verification status are up to date.'
          }
          action={
            <Link to="/provider/profile">
              <Button variant="outline">Review Profile & Areas</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => (
            <Card key={req._id} className="hover:border-primary-200 transition-all flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="primary" size="sm" className="mb-2">
                      {req.category?.name || 'Home Service'}
                    </Badge>
                    <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-1">
                      {req.title}
                    </h3>
                  </div>
                  <Badge variant="warning" size="sm">
                    {req.status}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {req.description}
                </p>

                {/* Logistics details */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{req.location?.city || 'Local City'}, {req.location?.state || 'CA'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{new Date(req.preferredDate).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {req.preferredTime?.start || '09:00'} – {req.preferredTime?.end || '17:00'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {req.quoteCount || 0} {req.quoteCount === 1 ? 'quote received' : 'quotes received'}
                    </span>
                  </div>
                </div>

                {/* Required Skills tags */}
                {req.requiredSkills && req.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {req.requiredSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600"
                      >
                        <Tag className="h-2.5 w-2.5 mr-1" />
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>

              {/* Action Footer */}
              <div className="p-4 bg-slate-50/60 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Posted {new Date(req.createdAt).toLocaleDateString()}
                </span>
                <Link to={`/provider/requests/${req._id}/quote`}>
                  <Button size="sm" icon={Send}>
                    Submit Quote
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchEligibleRequests(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchEligibleRequests(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderRequests;
