/**
 * Customer Service Requests List Page
 * Displays real submitted customer service requests with status filters and pagination.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  ClipboardList,
  Eye,
  Filter,
} from 'lucide-react';
import serviceRequestService from '../../services/serviceRequest.service';
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
  ErrorState,
} from '../../components/ui';

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

export const CustomerRequests = () => {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = useCallback(async (page = 1, status = statusFilter) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page, limit: 10 };
      if (status) params.status = status;

      const res = await serviceRequestService.getServiceRequests(params);
      setRequests(res.data?.items || []);
      setPagination(res.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load service requests');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests(1, statusFilter);
  }, [fetchRequests, statusFilter]);

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Service Requests</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track, review quotes, and monitor progress for all your home repair requests.
          </p>
        </div>
        <Link to="/customer/requests/new">
          <Button icon={Plus}>Create New Request</Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className="text-xs font-semibold uppercase text-slate-400 mr-2 flex items-center">
          <Filter className="h-3.5 w-3.5 mr-1" /> Filter Status:
        </span>
        {[
          { label: 'All Requests', value: '' },
          { label: 'Submitted', value: 'SUBMITTED' },
          { label: 'Matching / Quotes', value: 'MATCHING' },
          { label: 'Booked', value: 'BOOKED' },
          { label: 'In Progress', value: 'IN_PROGRESS' },
          { label: 'Completed', value: 'COMPLETED' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleStatusFilterChange(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="min-h-[350px] flex items-center justify-center">
          <LoadingSpinner size="lg" label="Loading your service requests..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load requests"
          message={error}
          onRetry={() => fetchRequests(pagination.page, statusFilter)}
        />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No service requests found"
          description={
            statusFilter
              ? `You do not have any requests with status "${statusFilter}". Try selecting "All Requests".`
              : 'You have not submitted any service requests yet. Start by creating your first request.'
          }
          action={
            <Link to="/customer/requests/new">
              <Button icon={Plus}>Request a Service</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardHeader
            title="Active & Historical Requests"
            subtitle={`Showing ${requests.length} of ${pagination.total} request(s)`}
          />
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request Title & Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Preferred Timing</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req._id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{req.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {req.category?.name || 'General Service'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={statusBadgeVariants[req.status] || 'default'}>
                          {req.status}
                        </Badge>
                        {req.quoteCount > 0 && (
                          <Link to={`/customer/requests/${req._id}/quotes`}>
                            <Badge variant="success" size="sm" className="hover:opacity-80 transition-opacity cursor-pointer">
                              {req.quoteCount} {req.quoteCount === 1 ? 'Quote' : 'Quotes'}
                            </Badge>
                          </Link>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-slate-700 flex items-center">
                        <Calendar className="h-3.5 w-3.5 mr-1 text-slate-400" />
                        {new Date(req.preferredDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center mt-0.5">
                        <Clock className="h-3 w-3 mr-1 text-slate-400" />
                        {req.preferredTime?.start || '09:00'} – {req.preferredTime?.end || '12:00'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-slate-700 flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-slate-400" />
                        {req.location?.city || 'Local Area'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {req.location?.postalCode || ''}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.quoteCount > 0 && (
                          <Link to={`/customer/requests/${req._id}/quotes`}>
                            <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                              Quotes ({req.quoteCount})
                            </Button>
                          </Link>
                        )}
                        <Link to={`/customer/requests/${req._id}`}>
                          <Button variant="outline" size="sm" icon={Eye}>
                            View
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchRequests(pagination.page - 1, statusFilter)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchRequests(pagination.page + 1, statusFilter)}
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

export default CustomerRequests;
