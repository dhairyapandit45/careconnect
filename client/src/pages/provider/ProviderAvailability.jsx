/**
 * Provider Weekly Availability Page
 * Allows service providers to manage their weekly working schedule, shifts, and off-days.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sun,
  Info,
} from 'lucide-react';
import availabilityService from '../../services/availability.service';
import {
  Button,
  Badge,
  Modal,
  Input,
  Select,
  LoadingSpinner,
} from '../../components/ui';

const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const INITIAL_FORM = {
  dayOfWeek: 'MONDAY',
  startTime: '09:00',
  endTime: '17:00',
  isAvailable: true,
};

export const ProviderAvailability = () => {
  const [shifts, setShifts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAvailability = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await availabilityService.getAvailability();
      setShifts(res.data?.shifts || []);
    } catch (err) {
      setError(err.message || 'Failed to load availability schedules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleOpenAddModal = (day = 'MONDAY') => {
    setFormData({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validate client-side format HH:mm
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(formData.startTime) || !timeRegex.test(formData.endTime)) {
      setFormError('Times must be in 24-hour HH:mm format (e.g. 09:00, 17:30)');
      return;
    }

    if (formData.startTime >= formData.endTime) {
      setFormError('Shift start time must be earlier than end time');
      return;
    }

    setIsSubmitting(true);
    try {
      await availabilityService.createAvailability({
        dayOfWeek: formData.dayOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        isAvailable: formData.isAvailable,
      });

      setSuccessMessage(`Shift for ${formData.dayOfWeek} added successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      handleCloseModal();
      await fetchAvailability();
    } catch (err) {
      setFormError(err.message || 'Failed to save shift slot. Check for overlapping hours.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm('Are you sure you want to remove this shift?')) return;
    setDeletingId(id);
    setError(null);
    try {
      await availabilityService.deleteAvailability(id);
      setShifts((prev) => prev.filter((s) => s._id !== id));
      setSuccessMessage('Shift deleted successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to remove shift');
    } finally {
      setDeletingId(null);
    }
  };

  // Group shifts by dayOfWeek
  const shiftsByDay = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = shifts.filter((s) => s.dayOfWeek === day);
    return acc;
  }, {});

  const totalShifts = shifts.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly Availability</h1>
          <p className="text-sm text-slate-500 mt-1">
            Set your weekly working shifts and hours to receive job requests that match your schedule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={fetchAvailability}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button icon={Plus} onClick={() => handleOpenAddModal('MONDAY')}>
            Add Shift Slot
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-sky-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-sky-800 leading-relaxed">
          <strong>Deterministic Scheduling:</strong> Our marketplace respects your configured hours.
          Customers booking services can only request appointments when you have active availability.
          Shifts cannot overlap on the same day. All times use 24-hour format.
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-sm text-emerald-800 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="min-h-[300px] flex items-center justify-center">
          <LoadingSpinner size="lg" label="Loading availability schedule..." />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              Weekly Roster ({totalShifts} active {totalShifts === 1 ? 'shift' : 'shifts'})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {DAYS_OF_WEEK.map((day) => {
              const dayShifts = shiftsByDay[day] || [];
              const isWeekend = day === 'SATURDAY' || day === 'SUNDAY';

              return (
                <div
                  key={day}
                  className={`rounded-2xl border transition-all flex flex-col justify-between ${
                    dayShifts.length > 0
                      ? 'bg-white border-slate-200 shadow-sm'
                      : isWeekend
                      ? 'bg-slate-50/60 border-dashed border-slate-200'
                      : 'bg-white/60 border-dashed border-slate-200'
                  }`}
                >
                  {/* Card Day Header */}
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {day.substring(0, 3)}
                      </span>
                      <span className="block text-[11px] text-slate-400 capitalize">
                        {day.toLowerCase()}
                      </span>
                    </div>
                    {dayShifts.length > 0 ? (
                      <Badge variant="success" size="sm">
                        {dayShifts.length} {dayShifts.length === 1 ? 'shift' : 'shifts'}
                      </Badge>
                    ) : (
                      <Badge variant="default" size="sm">
                        Off
                      </Badge>
                    )}
                  </div>

                  {/* Card Body - Shift List */}
                  <div className="p-3 flex-1 space-y-2">
                    {dayShifts.length === 0 ? (
                      <div className="py-4 text-center">
                        <Sun className="h-5 w-5 text-slate-300 mx-auto mb-1" />
                        <p className="text-[11px] text-slate-400">Day Off</p>
                      </div>
                    ) : (
                      dayShifts.map((shift) => (
                        <div
                          key={shift._id}
                          className="group relative bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl p-2.5 transition-all text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-xs font-semibold text-slate-800">
                              <Clock className="h-3 w-3 mr-1 text-primary-500" />
                              {shift.startTime} – {shift.endTime}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteShift(shift._id)}
                              disabled={deletingId === shift._id}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Delete shift"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] text-slate-500">Available</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Card Footer - Add Slot Button */}
                  <div className="p-2 border-t border-slate-100 bg-slate-50/40 rounded-b-2xl">
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(day)}
                      className="w-full text-center text-xs text-primary-600 hover:text-primary-700 font-medium py-1.5 rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Slot
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Shift Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Add Working Shift"
        description="Specify your active working hours. Overlapping shifts on the same day will be rejected."
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveShift} isLoading={isSubmitting}>
              Save Shift
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveShift} className="space-y-4 py-2">
          {formError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Day of Week <span className="text-rose-500">*</span>
            </label>
            <Select
              name="dayOfWeek"
              value={formData.dayOfWeek}
              onChange={handleFormChange}
              required
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day.charAt(0) + day.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Start Time (24h) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleFormChange}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                End Time (24h) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleFormChange}
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="isAvailable"
                checked={formData.isAvailable}
                onChange={handleFormChange}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
              />
              <span className="text-xs font-medium text-slate-700">
                Mark as active working shift
              </span>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProviderAvailability;
