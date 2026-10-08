/**
 * Disputes Operational Oversight Console
 * Allows platform administrators and operations managers to inspect, track, and audit dispute cases.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import {
  Card,
  CardContent,
  Button,
  Select,
  Badge,
  Modal,
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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const getDisputeStatusBadge = (status) => {
  switch (status) {
    case 'OPEN':
      return <Badge variant="warning">Open</Badge>;
    case 'UNDER_REVIEW':
      return <Badge variant="info">Under Review</Badge>;
    case 'RESOLVED':
      return <Badge variant="success">Resolved</Badge>;
    case 'CANCELLED':
      return <Badge variant="danger">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
};

export const DisputesOperationsPage = () => {
  const location = useLocation();
  const isOps = location.pathname.startsWith('/operations');

  // Filters & Pagination state
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [disputes, setDisputes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail modal state
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchDisputes = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
      };
      if (statusFilter) params.status = statusFilter;

      const res = await adminService.listDisputes(params, isOps);
      const data = res.data?.data || res.data || {};
      setDisputes(data.items || []);
      setPagination(data.pagination || { page, limit: 10, total: 0, totalPages: 1 });
      setCurrentPage(page);
    } catch (err) {
      setError(err.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isOps]);

  useEffect(() => {
    fetchDisputes(1);
  }, [fetchDisputes]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchDisputes(1);
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setCurrentPage(1);
  };

  const handleOpenDetailModal = (d) => {
    setSelectedDispute(d);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <h1 className="text-2xl font-bold text-slate-900">Disputes Queue</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Operational auditing and governance of marketplace disputes and escalation resolutions.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleFilterSubmit} className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-64">
              <Select
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <Button type="submit" variant="primary" size="md">
                Filter
              </Button>

              {statusFilter && (
                <Button type="button" variant="outline" size="md" onClick={handleResetFilters} icon={RotateCcw}>
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card>
        {loading && (
          <div className="py-16 flex justify-center items-center">
            <LoadingSpinner size="lg" label="Loading disputes..." />
          </div>
        )}

        {error && !loading && (
          <div className="p-6">
            <ErrorState
              title="Error Loading Disputes"
              message={error}
              onRetry={() => fetchDisputes(currentPage)}
            />
          </div>
        )}

        {!loading && !error && disputes.length === 0 && (
          <div className="py-12">
            <EmptyState
              icon={AlertTriangle}
              title="No Disputes Found"
              description="No disputes match the current criteria."
              action={
                <Button variant="outline" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              }
            />
          </div>
        )}

        {!loading && !error && disputes.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispute Ref</TableHead>
                    <TableHead>Reason / Category</TableHead>
                    <TableHead>Raised By</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputes.map((d) => (
                    <TableRow key={d._id}>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {d.disputeNumber || d._id.substring(d._id.length - 8).toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-800 text-sm">
                          {d.reason || d.category || 'General Dispute'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{d.raisedBy?.name || 'User'}</p>
                          <p className="text-xs text-slate-400">{d.raisedBy?.role || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-700">{d.customer?.name || '—'}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-700">{d.provider?.name || '—'}</p>
                      </TableCell>
                      <TableCell>{getDisputeStatusBadge(d.status)}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleOpenDetailModal(d)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold">{disputes.length}</span> of{' '}
                <span className="font-semibold">{pagination.total || 0}</span> disputes
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => fetchDisputes(currentPage - 1)}
                  icon={ChevronLeft}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-600 px-2 font-medium">
                  Page {currentPage} of {pagination.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= (pagination.totalPages || 1)}
                  onClick={() => fetchDisputes(currentPage + 1)}
                  icon={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Dispute Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Dispute Case Dossier"
        maxWidth="max-w-2xl"
      >
        {selectedDispute && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Dispute ID</span>
                <p className="font-mono text-xs text-slate-800 break-all">{selectedDispute._id}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Status</span>
                <div className="mt-1">{getDisputeStatusBadge(selectedDispute.status)}</div>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Raised By</span>
                <p className="font-semibold text-slate-900">{selectedDispute.raisedBy?.name || '—'}</p>
                <p className="text-xs text-slate-500">{selectedDispute.raisedBy?.email || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Reason</span>
                <p className="font-semibold text-slate-800">{selectedDispute.reason || selectedDispute.category || '—'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-medium text-slate-400 uppercase">Description</span>
                <p className="text-slate-800 mt-1 whitespace-pre-wrap">
                  {selectedDispute.description || 'No detailed statement provided.'}
                </p>
              </div>
              {selectedDispute.resolution && (
                <div className="col-span-2 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <span className="text-xs font-medium text-emerald-800 uppercase">Resolution Details</span>
                  <p className="text-xs text-emerald-900 mt-1 whitespace-pre-wrap">{selectedDispute.resolution}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Linked Booking</span>
                <p className="font-mono text-xs text-slate-800">
                  {selectedDispute.booking?._id || selectedDispute.booking || '—'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Linked Job</span>
                <p className="font-mono text-xs text-slate-800">
                  {selectedDispute.job?._id || selectedDispute.job || '—'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Created Date</span>
                <p className="text-slate-800">
                  {selectedDispute.createdAt ? new Date(selectedDispute.createdAt).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Resolved At</span>
                <p className="text-slate-800">
                  {selectedDispute.resolvedAt ? new Date(selectedDispute.resolvedAt).toLocaleString() : '—'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DisputesOperationsPage;

