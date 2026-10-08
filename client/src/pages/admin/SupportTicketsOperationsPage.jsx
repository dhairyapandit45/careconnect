/**
 * Support Tickets Operational Oversight Console
 * Allows platform administrators and operations managers to inspect and monitor support tickets.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  HelpCircle,
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
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_ON_CUSTOMER', label: 'Waiting on Customer' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'BOOKING_ISSUE', label: 'Booking Issue' },
  { value: 'PAYMENT_ISSUE', label: 'Payment Issue' },
  { value: 'ACCOUNT_ACCESS', label: 'Account Access' },
  { value: 'DISPUTE', label: 'Dispute' },
  { value: 'GENERAL_INQUIRY', label: 'General Inquiry' },
];

const getTicketStatusBadge = (status) => {
  switch (status) {
    case 'OPEN':
      return <Badge variant="warning">Open</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="info">In Progress</Badge>;
    case 'WAITING_ON_CUSTOMER':
      return <Badge variant="secondary">Waiting</Badge>;
    case 'RESOLVED':
      return <Badge variant="success">Resolved</Badge>;
    case 'CLOSED':
      return <Badge variant="outline">Closed</Badge>;
    default:
      return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
};

const getPriorityBadge = (priority) => {
  switch (priority) {
    case 'URGENT':
      return <Badge variant="danger">Urgent</Badge>;
    case 'HIGH':
      return <Badge variant="warning">High</Badge>;
    case 'MEDIUM':
      return <Badge variant="info">Medium</Badge>;
    case 'LOW':
      return <Badge variant="secondary">Low</Badge>;
    default:
      return <Badge variant="secondary">{priority || 'Normal'}</Badge>;
  }
};

export const SupportTicketsOperationsPage = () => {
  const location = useLocation();
  const isOps = location.pathname.startsWith('/operations');

  // Filters & Pagination state
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail modal state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchTickets = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
      };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await adminService.listTickets(params, isOps);
      const data = res.data?.data || res.data || {};
      setTickets(data.items || []);
      setPagination(data.pagination || { page, limit: 10, total: 0, totalPages: 1 });
      setCurrentPage(page);
    } catch (err) {
      setError(err.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, isOps]);

  useEffect(() => {
    fetchTickets(1);
  }, [fetchTickets]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchTickets(1);
  };

  const handleResetFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setCurrentPage(1);
  };

  const handleOpenDetailModal = (t) => {
    setSelectedTicket(t);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <HelpCircle className="h-6 w-6 text-rose-600" />
            <h1 className="text-2xl font-bold text-slate-900">Support Tickets Oversight</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Operational auditing and ticket monitoring across platform customer and provider inquiries.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleFilterSubmit} className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="w-48">
                <Select
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
              </div>

              <div className="w-44">
                <Select
                  options={PRIORITY_OPTIONS}
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                />
              </div>

              <div className="w-48">
                <Select
                  options={CATEGORY_OPTIONS}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                />
              </div>

              <Button type="submit" variant="primary" size="md">
                Filter
              </Button>

              {(statusFilter || priorityFilter || categoryFilter) && (
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
            <LoadingSpinner size="lg" label="Loading support tickets..." />
          </div>
        )}

        {error && !loading && (
          <div className="p-6">
            <ErrorState
              title="Error Loading Tickets"
              message={error}
              onRetry={() => fetchTickets(currentPage)}
            />
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="py-12">
            <EmptyState
              icon={HelpCircle}
              title="No Support Tickets Found"
              description="No tickets match the current filter criteria."
              action={
                <Button variant="outline" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              }
            />
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {t.ticketNumber || t._id.substring(t._id.length - 8).toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900 text-sm">{t.subject}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-600 font-medium">{t.category || 'Support'}</span>
                      </TableCell>
                      <TableCell>{getPriorityBadge(t.priority)}</TableCell>
                      <TableCell>{getTicketStatusBadge(t.status)}</TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-700">{t.assignedTo?.name || 'Unassigned'}</p>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleOpenDetailModal(t)}
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
                Showing <span className="font-semibold">{tickets.length}</span> of{' '}
                <span className="font-semibold">{pagination.total || 0}</span> tickets
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => fetchTickets(currentPage - 1)}
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
                  onClick={() => fetchTickets(currentPage + 1)}
                  icon={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Ticket Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Support Ticket Dossier"
        maxWidth="max-w-2xl"
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Ticket ID</span>
                <p className="font-mono text-xs text-slate-800 break-all">{selectedTicket._id}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Status & Priority</span>
                <div className="flex items-center space-x-2 mt-1">
                  {getTicketStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-medium text-slate-400 uppercase">Subject</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedTicket.subject}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs font-medium text-slate-400 uppercase">Description</span>
                <p className="text-slate-800 mt-1 whitespace-pre-wrap">
                  {selectedTicket.description || 'No description provided.'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Created By</span>
                <p className="font-medium text-slate-800">{selectedTicket.createdBy?.name || '—'}</p>
                <p className="text-xs text-slate-500">{selectedTicket.createdBy?.email || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Assigned Agent</span>
                <p className="font-medium text-slate-800">{selectedTicket.assignedTo?.name || 'Unassigned'}</p>
                <p className="text-xs text-slate-500">{selectedTicket.assignedTo?.email || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Category</span>
                <p className="text-slate-800">{selectedTicket.category || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Created Date</span>
                <p className="text-slate-800">
                  {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : '—'}
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

export default SupportTicketsOperationsPage;

