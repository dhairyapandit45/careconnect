/**
 * Admin Categories Management Page
 * Allows Platform Admins to view, create, edit, deactivate, and manage service categories.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Wrench,
  Sparkles,
  Zap,
  Droplets,
  Hammer,
  Search,
  AlertCircle,
  Sliders,
} from 'lucide-react';
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
  ErrorState,
} from '../../components/ui';

const ICON_OPTIONS = [
  { value: 'Wrench', label: 'Wrench (Appliance / General)' },
  { value: 'Sparkles', label: 'Sparkles (Cleaning / Detailing)' },
  { value: 'Zap', label: 'Zap (Electrical / Electronics)' },
  { value: 'Droplets', label: 'Droplets (Plumbing / Washing)' },
  { value: 'Hammer', label: 'Hammer (Carpentry / Maintenance)' },
];

const PRICING_UNIT_OPTIONS = [
  { value: 'STARTING_FROM', label: 'Starting From ($ / base)' },
  { value: 'HOURLY', label: 'Hourly Rate ($ / hr)' },
  { value: 'FIXED', label: 'Fixed Price ($)' },
  { value: 'QUOTE_REQUIRED', label: 'Quote Required' },
];

const iconComponentMap = {
  Wrench,
  Sparkles,
  Zap,
  Droplets,
  Hammer,
};

const initialFormState = {
  name: '',
  slug: '',
  description: '',
  icon: 'Wrench',
  startingPrice: 50,
  pricingUnit: 'STARTING_FROM',
  requiredSkills: '',
  isActive: true,
};

export const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await categoryService.getCategories({ includeInactive: true });
      setCategories(res.data?.categories || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setFormData(initialFormState);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      icon: cat.icon || 'Wrench',
      startingPrice: cat.startingPrice !== undefined ? cat.startingPrice : 50,
      pricingUnit: cat.pricingUnit || 'STARTING_FROM',
      requiredSkills: Array.isArray(cat.requiredSkills) ? cat.requiredSkills.join(', ') : '',
      isActive: cat.isActive !== undefined ? cat.isActive : true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Category name is required';
    }
    if (!formData.description.trim()) {
      errs.description = 'Description is required';
    }
    if (formData.startingPrice === '' || Number(formData.startingPrice) < 0) {
      errs.startingPrice = 'Starting price must be 0 or higher';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setActionMessage(null);

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      icon: formData.icon,
      pricingUnit: formData.pricingUnit,
      startingPrice: Number(formData.startingPrice),
      isActive: formData.isActive,
      requiredSkills: formData.requiredSkills
        ? formData.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    };

    if (formData.slug.trim()) {
      payload.slug = formData.slug.trim();
    }

    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory._id, payload);
        setActionMessage({ type: 'success', text: `Category "${payload.name}" updated successfully.` });
      } else {
        await categoryService.createCategory(payload);
        setActionMessage({ type: 'success', text: `Category "${payload.name}" created successfully.` });
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      setFormErrors({ submit: err.message || 'Operation failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      await categoryService.updateCategory(cat._id, { isActive: !cat.isActive });
      setActionMessage({
        type: 'success',
        text: `Category "${cat.name}" is now ${!cat.isActive ? 'Active' : 'Inactive'}.`,
      });
      fetchCategories();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update category status' });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? If service requests reference this category, it cannot be deleted.`)) {
      return;
    }

    setDeletingId(id);
    setActionMessage(null);
    try {
      await categoryService.deleteCategory(id);
      setActionMessage({ type: 'success', text: `Category "${name}" deleted.` });
      fetchCategories();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Cannot delete category. Try setting it to Inactive instead.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter((c) => {
    const q = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.slug && c.slug.toLowerCase().includes(q));
  });

  const activeCount = categories.filter((c) => c.isActive).length;
  const inactiveCount = categories.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Categories</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure service offerings, base pricing models, and required provider capabilities.
          </p>
        </div>
        <Button icon={Plus} onClick={handleOpenCreateModal}>
          Add Category
        </Button>
      </div>

      {/* Action Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Total Categories</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{categories.length}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Sliders className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Active Offerings</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Inactive / Archived</p>
              <p className="text-2xl font-bold text-slate-500 mt-1">{inactiveCount}</p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-500 rounded-lg">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Input
            icon={Search}
            placeholder="Search categories by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Table */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <LoadingSpinner size="lg" label="Loading categories..." />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchCategories} />
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={Sliders}
          title="No Categories Found"
          message={searchTerm ? 'No categories matched your search criteria.' : 'No service categories have been configured yet.'}
          actionText={searchTerm ? 'Clear Search' : 'Add First Category'}
          onAction={searchTerm ? () => setSearchTerm('') : handleOpenCreateModal}
        />
      ) : (
        <Card>
          <Table padding="compact">
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Pricing Model</TableHead>
                <TableHead>Required Skills</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((cat) => {
                const IconComponent = iconComponentMap[cat.icon] || Wrench;
                return (
                  <TableRow key={cat._id}>
                    <TableCell>
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-0.5 shrink-0">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{cat.name}</div>
                          <div className="text-xs text-slate-400 font-mono">/{cat.slug}</div>
                          <div className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-md">
                            {cat.description}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm font-semibold text-slate-900">
                        ${cat.startingPrice !== undefined ? cat.startingPrice : 0}
                      </div>
                      <div className="text-xs text-slate-400">{cat.pricingUnit}</div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {cat.requiredSkills && cat.requiredSkills.length > 0 ? (
                          cat.requiredSkills.map((skill, idx) => (
                            <Badge key={idx} variant="default" className="text-[10px]">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">None specified</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={cat.isActive ? 'success' : 'default'}>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title={cat.isActive ? 'Deactivate category' : 'Activate category'}
                          onClick={() => handleToggleActive(cat)}
                        >
                          {cat.isActive ? (
                            <XCircle className="h-4 w-4 text-amber-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Edit}
                          onClick={() => handleOpenEditModal(cat)}
                          title="Edit category"
                        />

                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          className="text-rose-600 hover:text-rose-700"
                          disabled={deletingId === cat._id}
                          onClick={() => handleDelete(cat._id, cat.name)}
                          title="Delete category"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingCategory ? 'Edit Service Category' : 'Create New Service Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.submit && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
              <span>{formErrors.submit}</span>
            </div>
          )}

          <Input
            label="Category Name"
            placeholder="e.g. Appliance Repair"
            value={formData.name}
            error={formErrors.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="URL Slug (Optional)"
            placeholder="e.g. appliance-repair (auto-generated if blank)"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of what this service covers..."
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 transition-colors focus:outline-hidden ${
                formErrors.description ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-blue-500'
              }`}
            />
            {formErrors.description && (
              <p className="text-xs text-rose-500 mt-1">{formErrors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Icon"
              options={ICON_OPTIONS}
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            />

            <Select
              label="Pricing Unit"
              options={PRICING_UNIT_OPTIONS}
              value={formData.pricingUnit}
              onChange={(e) => setFormData({ ...formData, pricingUnit: e.target.value })}
            />
          </div>

          <Input
            label="Starting Price ($)"
            type="number"
            min="0"
            step="1"
            value={formData.startingPrice}
            error={formErrors.startingPrice}
            onChange={(e) => setFormData({ ...formData, startingPrice: e.target.value })}
            required
          />

          <Input
            label="Required Capabilities / Skills (comma-separated)"
            placeholder="e.g. diagnostics, wiring, refrigeration"
            value={formData.requiredSkills}
            onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
          />

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
              Active offering (customers can book this service)
            </label>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminCategoriesPage;
