/**
 * User Management Console
 * Allows platform administrators and operations managers to audit user accounts,
 * filter by role and status, view dossiers, and execute account status transitions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Users,
  Search,
  RotateCcw,
  Eye,
  Edit,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import {
  Card,
  CardContent,
  Button,
  Input,
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

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: ROLES.CUSTOMER, label: 'Customer' },
  { value: ROLES.SERVICE_PROVIDER, label: 'Service Provider' },
  { value: ROLES.SUPPORT_AGENT, label: 'Support Agent' },
  { value: ROLES.OPERATIONS_MANAGER, label: 'Operations Manager' },
  { value: ROLES.PLATFORM_ADMIN, label: 'Platform Admin' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
];

const getStatusBadge = (status) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success">Active</Badge>;
    case 'SUSPENDED':
      return <Badge variant="danger">Suspended</Badge>;
    case 'PENDING_VERIFICATION':
      return <Badge variant="warning">Pending Verification</Badge>;
    default:
      return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
};

const getRoleBadge = (role) => {
  switch (role) {
    case ROLES.PLATFORM_ADMIN:
      return <Badge variant="primary">Platform Admin</Badge>;
    case ROLES.OPERATIONS_MANAGER:
      return <Badge variant="indigo">Operations Manager</Badge>;
    case ROLES.SUPPORT_AGENT:
      return <Badge variant="warning">Support Agent</Badge>;
    case ROLES.SERVICE_PROVIDER:
      return <Badge variant="secondary">Service Provider</Badge>;
    case ROLES.CUSTOMER:
      return <Badge variant="outline">Customer</Badge>;
    default:
      return <Badge variant="secondary">{role}</Badge>;
  }
};

export const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const isOps = location.pathname.startsWith('/operations');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Data state
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User detail modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Status update modal state
  const [targetUser, setTargetUser] = useState(null);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await adminService.listUsers(params, isOps);
      const data = res.data?.data || res.data || {};
      setUsers(data.items || []);
      setPagination(data.pagination || { page, limit: 10, total: 0, totalPages: 1 });
      setCurrentPage(page);
    } catch (err) {
      setError(err.message || 'Failed to load user accounts');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter, isOps]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const handleOpenDetailModal = (u) => {
    setSelectedUser(u);
    setDetailModalOpen(true);
  };

  const handleOpenUpdateModal = (u) => {
    setTargetUser(u);
    setNewStatus(u.status || 'ACTIVE');
    setStatusReason('');
    setUpdateError('');
    setUpdateModalOpen(true);
  };

  const handleConfirmStatusUpdate = async (e) => {
    e.preventDefault();
    if (!targetUser) return;

    // Check UI constraint: Operations Manager cannot change Platform Admin accounts
    if (currentUser?.role === ROLES.OPERATIONS_MANAGER && targetUser.role === ROLES.PLATFORM_ADMIN) {
      setUpdateError('Operations Managers are not permitted to modify Platform Administrator accounts.');
      return;
    }

    setUpdating(true);
    setUpdateError('');
    try {
      await adminService.updateUserStatus(
        targetUser._id,
        { status: newStatus, reason: statusReason.trim() },
        isOps
      );
      setUpdateModalOpen(false);
      setTargetUser(null);
      fetchUsers(currentPage);
    } catch (err) {
      setUpdateError(err.response?.data?.message || err.message || 'Failed to update user status');
    } finally {
      setUpdating(false);
    }
  };

  const isOpsManager = currentUser?.role === ROLES.OPERATIONS_MANAGER;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Browse, search, inspect, and manage platform user credentials and lifecycle statuses.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-72">
              <Input
                placeholder="Search by name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={Search}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="w-44">
                <Select
                  options={ROLE_OPTIONS}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                />
              </div>

              <div className="w-48">
                <Select
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
              </div>

              <Button type="submit" variant="primary" size="md">
                Filter
              </Button>

              {(searchTerm || roleFilter || statusFilter) && (
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
            <LoadingSpinner size="lg" label="Loading user directory..." />
          </div>
        )}

        {error && !loading && (
          <div className="p-6">
            <ErrorState
              title="Error Loading Users"
              message={error}
              onRetry={() => fetchUsers(currentPage)}
            />
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="py-12">
            <EmptyState
              icon={Users}
              title="No Users Found"
              description="No user accounts match the current filter criteria."
              action={
                <Button variant="outline" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              }
            />
          </div>
        )}

        {!loading && !error && users.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const cannotModify = isOpsManager && u.role === ROLES.PLATFORM_ADMIN;
                    return (
                      <TableRow key={u._id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-900">{u.name || 'Unnamed User'}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell>{getStatusBadge(u.status)}</TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {u.phone || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Eye}
                              onClick={() => handleOpenDetailModal(u)}
                            >
                              Details
                            </Button>
                            <Button
                              variant={cannotModify ? 'ghost' : 'outline'}
                              size="sm"
                              icon={Edit}
                              disabled={cannotModify}
                              title={
                                cannotModify
                                  ? 'Operations Managers cannot modify Platform Admin accounts'
                                  : 'Update account status'
                              }
                              onClick={() => handleOpenUpdateModal(u)}
                            >
                              Update Status
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Showing <span className="font-semibold">{users.length}</span> of{' '}
                <span className="font-semibold">{pagination.total || 0}</span> accounts
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => fetchUsers(currentPage - 1)}
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
                  onClick={() => fetchUsers(currentPage + 1)}
                  icon={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* User Details Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="User Account Dossier"
        maxWidth="max-w-xl"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">User ID</span>
                <p className="font-mono text-xs text-slate-800 break-all">{selectedUser._id}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Full Name</span>
                <p className="font-semibold text-slate-900">{selectedUser.name}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Email</span>
                <p className="text-slate-800">{selectedUser.email}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Phone</span>
                <p className="text-slate-800">{selectedUser.phone || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Platform Role</span>
                <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Account Status</span>
                <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Registered Date</span>
                <p className="text-slate-800">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase">Last Updated</span>
                <p className="text-slate-800">
                  {selectedUser.updatedAt ? new Date(selectedUser.updatedAt).toLocaleString() : '—'}
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

      {/* Status Update Modal */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Update Account Status"
        maxWidth="max-w-md"
      >
        {targetUser && (
          <form onSubmit={handleConfirmStatusUpdate} className="space-y-4">
            {isOpsManager && targetUser.role === ROLES.PLATFORM_ADMIN ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Action Restricted</p>
                  <p className="text-xs mt-1">
                    Operations Managers cannot modify Platform Administrator accounts.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Transition account status for{' '}
                  <span className="font-semibold text-slate-900">{targetUser.name}</span> ({targetUser.email}).
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    New Account Status
                  </label>
                  <Select
                    options={[
                      { value: 'ACTIVE', label: 'ACTIVE — Fully operational account' },
                      { value: 'SUSPENDED', label: 'SUSPENDED — Locked account access' },
                      { value: 'PENDING_VERIFICATION', label: 'PENDING_VERIFICATION — Verification review' },
                    ]}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Reason / Notes (Optional)
                  </label>
                  <Input
                    placeholder="Provide audit reason for account change..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>

                {updateError && (
                  <p className="text-xs font-semibold text-rose-600" role="alert">
                    {updateError}
                  </p>
                )}

                <div className="flex items-center justify-end space-x-3 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUpdateModalOpen(false)}
                    disabled={updating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={updating}
                    disabled={updating}
                  >
                    Confirm Update
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
};

export default UserManagementPage;

