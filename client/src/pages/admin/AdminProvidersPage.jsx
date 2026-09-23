/**
 * Platform Admin - Service Provider Verification & Compliance Console
 * Allows administrators to audit provider onboarding submissions, inspect trade credentials,
 * and execute state-machine-governed verification status transitions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  ExternalLink,
  Award,
  Layers,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck,
} from 'lucide-react';
import providerService from '../../services/provider.service';
import categoryService from '../../services/category.service';
import {
  Button,
  Input,
  Select,
  Card,
  CardContent,
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
} from '../../components/ui';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending Review' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const STATUS_CONFIGS = {
  PENDING: { variant: 'warning', icon: Clock, label: 'Pending' },
  UNDER_REVIEW: { variant: 'primary', icon: Clock, label: 'Under Review' },
  APPROVED: { variant: 'success', icon: ShieldCheck, label: 'Approved' },
  REJECTED: { variant: 'danger', icon: XCircle, label: 'Rejected' },
  SUSPENDED: { variant: 'danger', icon: AlertTriangle, label: 'Suspended' },
};

// Transition options mapped to the provider verification state machine
const ALLOWED_ACTIONS_BY_STATUS = {
  PENDING: [
    { action: 'APPROVE', label: 'Approve Provider', variant: 'primary', requiresNotes: false },
    { action: 'REQUEST_REVIEW', label: 'Mark Under Review', variant: 'outline', requiresNotes: false },
    { action: 'REJECT', label: 'Reject Verification', variant: 'danger', requiresNotes: true },
  ],
  UNDER_REVIEW: [
    { action: 'APPROVE', label: 'Approve Provider', variant: 'primary', requiresNotes: false },
    { action: 'REJECT', label: 'Reject Verification', variant: 'danger', requiresNotes: true },
    { action: 'REQUEST_REVIEW', label: 'Return to Pending', targetStatus: 'PENDING', variant: 'outline', requiresNotes: false },
  ],
  APPROVED: [
    { action: 'SUSPEND', label: 'Suspend Account', variant: 'danger', requiresNotes: true },
    { action: 'REQUEST_REVIEW', label: 'Move to Under Review', variant: 'outline', requiresNotes: true },
  ],
  REJECTED: [
    { action: 'REQUEST_REVIEW', label: 'Move to Under Review', variant: 'outline', requiresNotes: false },
    { action: 'REQUEST_REVIEW', label: 'Reset to Pending', targetStatus: 'PENDING', variant: 'outline', requiresNotes: false },
  ],
  SUSPENDED: [
    { action: 'APPROVE', label: 'Reactivate (Approve)', variant: 'primary', requiresNotes: false },
    { action: 'REQUEST_REVIEW', label: 'Move to Under Review', variant: 'outline', requiresNotes: false },
  ],
};

export const AdminProvidersPage = () => {
  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState([]);

  // Data states
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Audit modal state
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [auditAction, setAuditAction] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Load categories for filter dropdown
  useEffect(() => {
    categoryService.getCategories({ includeInactive: true })
      .then((res) => setCategories(res.data?.data?.categories || []))
      .catch(() => {});
  }, []);

  // Fetch providers list
  const fetchProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = {
        page: currentPage,
        limit: 10,
      };
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (categoryFilter) params.category = categoryFilter;

      const res = await providerService.getProvidersAdmin(params);
      const data = res.data?.data || {};
      setProviders(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch provider listings');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery, categoryFilter]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Open audit modal and fetch full provider dossier
  const handleOpenAuditModal = async (providerId) => {
    try {
      setIsModalOpen(true);
      setModalLoading(true);
      setActionError(null);
      setAuditAction(null);
      setActionNotes('');

      const res = await providerService.getProviderAdminById(providerId);
      setSelectedProvider(res.data?.data?.profile);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to load provider credentials');
    } finally {
      setModalLoading(false);
    }
  };

  // Close audit modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProvider(null);
    setAuditAction(null);
    setActionNotes('');
    setActionError(null);
  };

  // Execute verification status transition
  const handleExecuteVerification = async () => {
    if (!auditAction || !selectedProvider) return;

    if (auditAction.requiresNotes && (!actionNotes.trim() || actionNotes.trim().length < 5)) {
      setActionError(`Notes/Reason is required (minimum 5 characters) for action: ${auditAction.label}`);
      return;
    }

    try {
      setIsExecutingAction(true);
      setActionError(null);

      const payload = {
        notes: actionNotes.trim(),
      };

      if (auditAction.targetStatus) {
        payload.status = auditAction.targetStatus;
      } else {
        payload.action = auditAction.action;
      }

      const res = await providerService.verifyProviderAdmin(selectedProvider._id, payload);
      const updatedProfile = res.data?.data?.profile;

      // Update local state and table
      setSelectedProvider(updatedProfile);
      setAuditAction(null);
      setActionNotes('');
      fetchProviders();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update verification status');
    } finally {
      setIsExecutingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Provider Verification Console</h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit trade licenses, manage compliance reviews, and control marketplace onboarding status.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="sm:col-span-2">
              <Input
                placeholder="Search by business name or owner..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                icon={Search}
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={STATUS_OPTIONS}
              />
            </div>

            {/* Category Filter */}
            <div>
              <Select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map((c) => ({ value: c._id, label: c.name })),
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Providers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-slate-500">Loading service providers...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : providers.length === 0 ? (
            <EmptyState
              icon={FileCheck}
              title="No Providers Found"
              description="No service providers match the current filters or pending review queue."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business & Owner</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Rates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => {
                  const cfg = STATUS_CONFIGS[p.verificationStatus] || STATUS_CONFIGS.PENDING;
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={p._id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{p.businessName || 'Unnamed Business'}</p>
                          <p className="text-xs text-slate-500">{p.user?.name} • {p.user?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(p.serviceCategories || []).slice(0, 2).map((cat) => (
                            <span key={typeof cat === 'object' ? cat._id : cat} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                              {typeof cat === 'object' ? cat.name : cat}
                            </span>
                          ))}
                          {(p.serviceCategories || []).length > 2 && (
                            <span className="text-[11px] text-slate-400">+{p.serviceCategories.length - 2}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-700 font-medium">{p.experienceYears} Years</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-700 font-semibold">
                          ${p.pricing?.hourlyRate || p.hourlyRate || 0}/hr
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} size="sm" className="inline-flex items-center gap-1">
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAuditModal(p._id)}
                          className="inline-flex items-center gap-1 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" /> Audit & Verify
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination Footer */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> ({pagination.total} providers)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pagination.pages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pagination.pages))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit & Verification Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedProvider ? `Audit Provider: ${selectedProvider.businessName}` : 'Provider Audit'}
        maxWidth="max-w-3xl"
      >
        {modalLoading ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-xs text-slate-500">Loading provider credentials and audit history...</p>
          </div>
        ) : selectedProvider ? (
          <div className="space-y-6">
            {/* Action Alert Banner */}
            {actionError && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Header info */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Current Verification Status</span>
                <div className="mt-1">
                  {(() => {
                    const cfg = STATUS_CONFIGS[selectedProvider.verificationStatus] || STATUS_CONFIGS.PENDING;
                    const Icon = cfg.icon;
                    return (
                      <Badge variant={cfg.variant} size="md" className="inline-flex items-center gap-1.5 py-1 px-3">
                        <Icon className="w-4 h-4" />
                        {cfg.label}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Owner: <strong className="text-slate-900">{selectedProvider.user?.name}</strong></p>
                <p>Email: {selectedProvider.user?.email}</p>
                <p>Experience: <strong>{selectedProvider.experienceYears} Years</strong></p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase mb-1">Company Description</h4>
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-line">
                {selectedProvider.description || 'No description provided.'}
              </p>
            </div>

            {/* Categories & Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" /> Service Categories
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedProvider.serviceCategories || []).map((cat) => (
                    <Badge key={typeof cat === 'object' ? cat._id : cat} variant="primary" size="sm">
                      {typeof cat === 'object' ? cat.name : cat}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-indigo-600" /> Skills & Disciplines
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedProvider.skills || []).map((sk) => (
                    <Badge key={sk} variant="secondary" size="sm">
                      {sk}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Coverage Areas */}
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Coverage Cities & Sub-areas
              </h4>
              <div className="flex flex-wrap gap-2">
                {(selectedProvider.serviceAreas || []).map((sa, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-800">
                    📍 <strong>{sa.city}</strong> {sa.areas?.length > 0 ? `(${sa.areas.join(', ')})` : ''}
                  </span>
                ))}
              </div>
            </div>

            {/* Verification Documents Audit List */}
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-blue-600" /> Attached Documents & Licenses ({selectedProvider.documents?.length || 0})
              </h4>
              {(!selectedProvider.documents || selectedProvider.documents.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No verification documents provided by this provider.</p>
              ) : (
                <div className="space-y-2">
                  {selectedProvider.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          {doc.type}
                        </span>
                        <p className="text-xs font-semibold text-slate-900 mt-1">{doc.name}</p>
                      </div>
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Audit Document <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">No link</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing Verification Notes */}
            {selectedProvider.verificationNotes && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 uppercase">Existing Audit Notes</span>
                <p className="text-amber-800 mt-0.5 whitespace-pre-line">{selectedProvider.verificationNotes}</p>
              </div>
            )}

            {/* State-Machine Verification Action Panel */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Audit Decision & Status Transition
              </h4>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {(ALLOWED_ACTIONS_BY_STATUS[selectedProvider.verificationStatus] || []).map((btn, idx) => {
                  const isSelected = auditAction?.action === btn.action && auditAction?.targetStatus === btn.targetStatus;
                  return (
                    <Button
                      key={idx}
                      size="sm"
                      variant={isSelected ? btn.variant : 'outline'}
                      className={isSelected ? 'ring-2 ring-blue-500 font-semibold' : ''}
                      onClick={() => {
                        setAuditAction(btn);
                        setActionError(null);
                      }}
                    >
                      {isSelected ? `✓ ${btn.label}` : btn.label}
                    </Button>
                  );
                })}
              </div>

              {/* Action Notes Input */}
              {auditAction && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Verification Notes / Reason {auditAction.requiresNotes ? <span className="text-red-500">* (Mandatory)</span> : '(Optional)'}
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder={`Provide detailed feedback or reason for this audit action (${auditAction.label})...`}
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant={auditAction.variant}
                      disabled={isExecutingAction}
                      onClick={handleExecuteVerification}
                    >
                      {isExecutingAction ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-1.5" />
                          Executing Transition...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Confirm: {auditAction.label}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AdminProvidersPage;
