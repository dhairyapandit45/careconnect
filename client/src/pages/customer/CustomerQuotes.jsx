/**
 * Customer Quotes Central Dashboard Page
 * Lists all customer service requests that have received provider quotes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  ArrowRight,
  RefreshCw,
  Plus,
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

export const CustomerQuotes = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequestsWithQuotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await serviceRequestService.getServiceRequests({ limit: 50 });
      setRequests(res.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load requests with quotes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequestsWithQuotes();
  }, [fetchRequestsWithQuotes]);

  // Highlight requests with quotes
  const requestsWithQuotes = requests.filter((r) => (r.quoteCount || 0) > 0);
  const otherRequests = requests.filter((r) => !r.quoteCount || r.quoteCount === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Received Quotes & Estimates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Compare proposals submitted by verified local service professionals for your requests.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={fetchRequestsWithQuotes}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Link to="/customer/requests/new">
            <Button icon={Plus}>New Request</Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[350px] flex items-center justify-center">
          <LoadingSpinner size="lg" label="Checking for received provider quotes..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load quotes"
          message={error}
          onRetry={fetchRequestsWithQuotes}
        />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No service requests yet"
          description="You have not created any service requests. Create a request to start receiving competitive quotes."
          action={
            <Link to="/customer/requests/new">
              <Button icon={Plus}>Create Service Request</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Requests with quotes ready for review */}
          <Card>
            <CardHeader
              title="Requests With Quotes Ready to Review"
              subtitle={`${requestsWithQuotes.length} service request(s) currently have quotes`}
            />
            <CardContent className="p-0">
              {requestsWithQuotes.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No quotes received yet for your active requests. Providers are notified and will quote soon.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Request</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Quotes Received</TableHead>
                      <TableHead>Preferred Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestsWithQuotes.map((req) => (
                      <TableRow key={req._id}>
                        <TableCell>
                          <div className="font-semibold text-slate-900">{req.title}</div>
                          <div className="text-xs text-slate-500">
                            {req.category?.name || 'General Service'} • {req.location?.city}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant={statusBadgeVariants[req.status] || 'default'}>
                            {req.status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant="success">
                            {req.quoteCount} {req.quoteCount === 1 ? 'Quote' : 'Quotes'}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs text-slate-600">
                          {new Date(req.preferredDate).toLocaleDateString()}
                        </TableCell>

                        <TableCell className="text-right">
                          <Link to={`/customer/requests/${req._id}/quotes`}>
                            <Button size="sm" icon={ArrowRight}>
                              Compare Quotes
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Other Active Requests */}
          {otherRequests.length > 0 && (
            <Card>
              <CardHeader
                title="Awaiting Provider Quotes"
                subtitle={`${otherRequests.length} request(s) waiting for quotes`}
              />
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Request</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherRequests.map((req) => (
                      <TableRow key={req._id}>
                        <TableCell>
                          <div className="font-semibold text-slate-900">{req.title}</div>
                          <div className="text-xs text-slate-500">{req.category?.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariants[req.status] || 'default'}>
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {req.location?.city}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link to={`/customer/requests/${req._id}`}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerQuotes;
