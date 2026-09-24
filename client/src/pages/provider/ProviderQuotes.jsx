/**
 * Provider Submitted Quotes Page
 * Allows service providers to track the status of their quotes and withdraw active quotes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FileText,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Filter,
} from 'lucide-react';
import quoteService from '../../services/quote.service';
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
  LoadingSpinner,
  EmptyState,
} from '../../components/ui';

const quoteBadgeVariants = {
  SUBMITTED: 'primary',
  VIEWED: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'default',
  EXPIRED: 'default',
};

export const ProviderQuotes = () => {
  const location = useLocation();
  const [quotes, setQuotes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(location.state?.message || null);
  const [withdrawingId, setWithdrawingId] = useState(null);

  const fetchQuotes = useCallback(async (page = 1, status = statusFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (status) params.status = status;

      const res = await quoteService.getProviderQuotes(params);
      setQuotes(res.data?.items || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load your submitted quotes');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchQuotes(1, statusFilter);
  }, [fetchQuotes, statusFilter]);

  const handleWithdraw = async (quoteId) => {
    if (!window.confirm('Are you sure you want to withdraw this quote? The customer will no longer be able to accept it.')) {
      return;
    }

    setWithdrawingId(quoteId);
    setError(null);
    try {
      await quoteService.withdrawQuote(quoteId);
      setActionSuccess('Quote has been successfully withdrawn.');
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchQuotes(pagination.page, statusFilter);
    } catch (err) {
      setError(err.message || 'Failed to withdraw quote.');
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Submitted Quotes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor proposal progress, customer views, awards, and quote lifecycle statuses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={() => fetchQuotes(pagination.page, statusFilter)}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Link to="/provider/requests">
            <Button icon={FileText}>Find Opportunities</Button>
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-sm text-emerald-800 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className="text-xs font-semibold uppercase text-slate-400 mr-2 flex items-center">
          <Filter className="h-3.5 w-3.5 mr-1" /> Filter Status:
        </span>
        {[
          { label: 'All Quotes', value: '' },
          { label: 'Submitted', value: 'SUBMITTED' },
          { label: 'Viewed', value: 'VIEWED' },
          { label: 'Accepted', value: 'ACCEPTED' },
          { label: 'Rejected', value: 'REJECTED' },
          { label: 'Withdrawn', value: 'WITHDRAWN' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="min-h-[350px] flex items-center justify-center">
          <LoadingSpinner size="lg" label="Loading submitted quotes..." />
        </div>
      ) : quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No submitted quotes found"
          description={
            statusFilter
              ? `You do not have any quotes matching status "${statusFilter}".`
              : 'You have not submitted any quotes yet. Browse available service requests to find jobs in your area.'
          }
          action={
            <Link to="/provider/requests">
              <Button icon={FileText}>Discover Jobs</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardHeader
            title="My Proposals"
            subtitle={`Showing ${quotes.length} of ${pagination.total} quote(s)`}
          />
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Request</TableHead>
                  <TableHead>Quote Amount</TableHead>
                  <TableHead>Est. Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => {
                  const canWithdraw =
                    quote.status === 'SUBMITTED' || quote.status === 'VIEWED';

                  return (
                    <TableRow key={quote._id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">
                          {quote.serviceRequest?.title || 'Home Service Request'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {quote.description}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-slate-900">
                          ₹{quote.amount?.toLocaleString('en-IN') || quote.pricing?.totalAmount}
                        </div>
                        <span className="text-[10px] text-slate-400">INR</span>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-slate-700 flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          {quote.estimatedDuration || quote.estimatedHours || '—'} hrs
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant={quoteBadgeVariants[quote.status] || 'default'}>
                          {quote.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-slate-600 flex items-center">
                          <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          {quote.validUntil
                            ? new Date(quote.validUntil).toLocaleDateString()
                            : 'N/A'}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-slate-500">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="text-right">
                        {canWithdraw ? (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={XCircle}
                            onClick={() => handleWithdraw(quote._id)}
                            isLoading={withdrawingId === quote._id}
                            className="text-rose-600 hover:text-rose-700 hover:border-rose-300"
                          >
                            Withdraw
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No action</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 p-4">
              <span className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchQuotes(pagination.page - 1, statusFilter)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchQuotes(pagination.page + 1, statusFilter)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default ProviderQuotes;
