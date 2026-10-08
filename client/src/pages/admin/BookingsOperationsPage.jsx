/**
 * Bookings Operational Oversight Console
 * Read-only platform inspection of bookings for Platform Administrators and Operations Managers.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Calendar,
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
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const getBookingStatusBadge = (status) => {
  switch (status) {
    case 'PENDING':
      return <Badge variant="warning">Pending</Badge>;
    case 'CONFIRMED':
      return <Badge variant="primary">Confirmed</Badge>;
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

export const BookingsOperationsPage = () => {
  const location = useLocation();
  const isOps = location.pathname.startsWith('/operations');

  // Filters & Pagination state
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchBookings = useCallback(async (page = 1) => {
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

      const res = await adminService.listBookings(params, isOps);
      const data = res.data?.data || res.data || {};
      setBookings(data.items || []);
      setPagination(data.pagination || { page, limit: 10, total: 0, totalPages: 1 });
      setCurrentPage(page);
    } catch (err) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate, isOps]);

  useEffect(() => {
    fetchBookings(1);
  }, [fetchBookings]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setDateError('');

    if (startDate && endDate) {
      if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
        setDateError('Start date must be less than or equal to End date');
        return;
      }
    }

    fetchBookings(1);
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setDateError('');
    setCurrentPage(1);
  };

  const handleOpenDetailModal = (b) => {
    setSelectedBooking(b);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">Bookings Oversight</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Read-only operational tracking and status inspection across platform service bookings.
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
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-hidden"
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
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-hidden"
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
            <LoadingSpinner size="lg" label="Loading bookings..." />
          </div>
        )}

        {error && !loading && (
          <div className="p-6">
            <ErrorState
              title="Error Loading Bookings"
              message={error}
              onRetry={() => fetchBookings(currentPage)}
            />
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div className="py-12">
            <EmptyState
              icon={Calendar}
              title="No Bookings Found"
              description="No bookings match the specified filter and date parameters."
              action={
                <Button variant="outline" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              }
            />
          </div>
        )}

        {!loading && !error && bookings.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking Ref</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Service / Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => (
                    <TableRow key={b._id}>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {b.bookingNumber || b._id.substring(b._id.length - 8).toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{b.customer?.name || 'Customer'}</p>
                          <p className="text-xs text-slate-500">{b.customer?.email || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{b.provider?.name || 'Provider'}</p>
                          <p className="text-xs text-slate-500">{b.provider?.email || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-700">
                          {b.serviceRequest?.title || b.serviceCategory || 'Service'}
                        </p>
                      </TableCell>
                      <TableCell>{getBookingStatusBadge(b.status)}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleOpenDetailModal(b)}
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
                Showing <span className="font-semibold">{bookings.length}</span> of{' '}
                <span className="font-semibold">{pagination.total || 0}</span> bookings
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => fetchBookings(currentPage - 1)}
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
                  onClick={() => fetchBookings(currentPage + 1)}
                  icon={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Booking Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Booking Inspection Dossier"
        maxWidth="max-w-2xl"
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Booking ID</span>
                <p className="font-mono text-xs text-slate-800 break-all">{selectedBooking._id}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Status</span>
                <div className="mt-1">{getBookingStatusBadge(selectedBooking.status)}</div>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Customer</span>
                <p className="font-semibold text-slate-900">{selectedBooking.customer?.name || '—'}</p>
                <p className="text-xs text-slate-500">{selectedBooking.customer?.email || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Provider</span>
                <p className="font-semibold text-slate-900">{selectedBooking.provider?.name || '—'}</p>
                <p className="text-xs text-slate-500">{selectedBooking.provider?.email || '—'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-medium text-slate-400 uppercase">Service Details</span>
                <p className="font-medium text-slate-800">
                  {selectedBooking.serviceRequest?.title || 'Direct Booking'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedBooking.serviceRequest?.description || 'No extended description recorded.'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Scheduled Date</span>
                <p className="text-slate-800">
                  {selectedBooking.scheduledDate
                    ? new Date(selectedBooking.scheduledDate).toLocaleString()
                    : selectedBooking.date || '—'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Created Date</span>
                <p className="text-slate-800">
                  {selectedBooking.createdAt ? new Date(selectedBooking.createdAt).toLocaleString() : '—'}
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

export default BookingsOperationsPage;

