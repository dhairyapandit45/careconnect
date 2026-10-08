/**
 * Jobs Operational Oversight Console
 * Read-only platform inspection of jobs for Platform Administrators and Operations Managers.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Briefcase,
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
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const getJobStatusBadge = (status) => {
  switch (status) {
    case 'ASSIGNED':
      return <Badge variant="warning">Assigned</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="info">In Progress</Badge>;
    case 'COMPLETED':
      return <Badge variant="success">Completed</Badge>;
    case 'CANCELLED':
      return <Badge variant="danger">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
};

export const JobsOperationsPage = () => {
  const location = useLocation();
  const isOps = location.pathname.startsWith('/operations');

  // Filters & Pagination state
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail modal state
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
      };
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await adminService.listJobs(params, isOps);
      const data = res.data?.data || res.data || {};
      setJobs(data.items || []);
      setPagination(data.pagination || { page, limit: 10, total: 0, totalPages: 1 });
      setCurrentPage(page);
    } catch (err) {
      setError(err.message || 'Failed to load operational jobs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate, isOps]);

  useEffect(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setDateError('');

    if (startDate && endDate) {
      if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
        setDateError('Start date must be less than or equal to End date');
        return;
      }
    }

    fetchJobs(1);
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setDateError('');
    setCurrentPage(1);
  };

  const handleOpenDetailModal = (j) => {
    setSelectedJob(j);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Briefcase className="h-6 w-6 text-sky-600" />
            <h1 className="text-2xl font-bold text-slate-900">Jobs Oversight</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Read-only operational tracking and performance inspection of on-ground service fulfillment.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleFilterSubmit} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="w-full md:w-56">
              <Select
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center space-x-2">
                <label htmlFor="startDate" className="text-xs text-slate-500 font-medium">From:</label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDateError('');
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center space-x-2">
                <label htmlFor="endDate" className="text-xs text-slate-500 font-medium">To:</label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDateError('');
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-sky-500 focus:outline-hidden"
                />
              </div>

              <Button type="submit" variant="primary" size="md">
                Apply Filters
              </Button>

              {(statusFilter || startDate || endDate) && (
                <Button type="button" variant="outline" size="md" onClick={handleResetFilters} icon={RotateCcw}>
                  Reset
                </Button>
              )}
            </div>
          </form>

          {dateError && (
            <p className="text-xs font-semibold text-rose-600 mt-2" role="alert">
              {dateError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card>
        {loading && (
          <div className="py-16 flex justify-center items-center">
            <LoadingSpinner size="lg" label="Loading jobs..." />
          </div>
        )}

        {error && !loading && (
          <div className="p-6">
            <ErrorState
              title="Error Loading Jobs"
              message={error}
              onRetry={() => fetchJobs(currentPage)}
            />
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="py-12">
            <EmptyState
              icon={Briefcase}
              title="No Jobs Found"
              description="No service jobs match the specified filter and date parameters."
              action={
                <Button variant="outline" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              }
            />
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Booking Ref</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j._id}>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {j.jobNumber || j._id.substring(j._id.length - 8).toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-slate-600">
                          {j.booking?._id
                            ? j.booking._id.substring(j.booking._id.length - 8).toUpperCase()
                            : j.booking
                            ? String(j.booking).substring(String(j.booking).length - 8).toUpperCase()
                            : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{j.customer?.name || 'Customer'}</p>
                          <p className="text-xs text-slate-500">{j.customer?.email || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{j.provider?.name || 'Provider'}</p>
                          <p className="text-xs text-slate-500">{j.provider?.email || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getJobStatusBadge(j.status)}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {j.createdAt ? new Date(j.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleOpenDetailModal(j)}
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
                Showing <span className="font-semibold">{jobs.length}</span> of{' '}
                <span className="font-semibold">{pagination.total || 0}</span> jobs
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => fetchJobs(currentPage - 1)}
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
                  onClick={() => fetchJobs(currentPage + 1)}
                  icon={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Job Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Job Inspection Dossier"
        maxWidth="max-w-2xl"
      >
        {selectedJob && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Job ID</span>
                <p className="font-mono text-xs text-slate-800 break-all">{selectedJob._id}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Status</span>
                <div className="mt-1">{getJobStatusBadge(selectedJob.status)}</div>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Customer</span>
                <p className="font-semibold text-slate-900">{selectedJob.customer?.name || '—'}</p>
                <p className="text-xs text-slate-500">{selectedJob.customer?.email || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Provider</span>
                <p className="font-semibold text-slate-900">{selectedJob.provider?.name || '—'}</p>
                <p className="text-xs text-slate-500">{selectedJob.provider?.email || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Linked Booking ID</span>
                <p className="font-mono text-xs text-slate-800 break-all">
                  {selectedJob.booking?._id || selectedJob.booking || '—'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Started At</span>
                <p className="text-slate-800">
                  {selectedJob.startedAt ? new Date(selectedJob.startedAt).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Completed At</span>
                <p className="text-slate-800">
                  {selectedJob.completedAt ? new Date(selectedJob.completedAt).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Created Date</span>
                <p className="text-slate-800">
                  {selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleString() : '—'}
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

export default JobsOperationsPage;

