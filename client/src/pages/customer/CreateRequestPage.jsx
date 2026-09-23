/**
 * Customer Service Request Creation Wizard
 * Step 1: Category Selection
 * Step 2: Problem Description
 * Step 3: Service Location
 * Step 4: Schedule Preference
 * Step 5: Review & Submit
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Wrench,
  Sparkles,
  Zap,
  Droplets,
  Hammer,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import categoryService from '../../services/category.service';
import serviceRequestService from '../../services/serviceRequest.service';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Badge,
  LoadingSpinner,
} from '../../components/ui';

const iconMap = {
  Wrench,
  Sparkles,
  Zap,
  Droplets,
  Hammer,
};

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

export const CreateRequestPage = () => {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Form payload state
  const [formData, setFormData] = useState({
    categoryId: '',
    title: '',
    description: '',
    address: '',
    city: '',
    postalCode: '',
    state: '',
    preferredDate: getTomorrowDate(),
    startTime: '09:00',
    endTime: '12:00',
    requiredSkills: [],
  });

  // Fetch active categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        setIsLoadingCategories(true);
        const res = await categoryService.getCategories();
        const activeCats = res.data?.categories || [];
        setCategories(activeCats);
        if (activeCats.length > 0) {
          setFormData((prev) => (prev.categoryId ? prev : { ...prev, categoryId: activeCats[0]._id }));
        }
      } catch (err) {
        setSubmitError(err.message || 'Failed to load service categories');
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCats();
  }, []);

  const selectedCategory = categories.find((c) => c._id === formData.categoryId);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSkillToggle = (skill) => {
    setFormData((prev) => {
      const exists = prev.requiredSkills.includes(skill);
      return {
        ...prev,
        requiredSkills: exists
          ? prev.requiredSkills.filter((s) => s !== skill)
          : [...prev.requiredSkills, skill],
      };
    });
  };

  // Step-by-step validations
  const validateStep = (currentStep) => {
    const errors = {};

    if (currentStep === 1) {
      if (!formData.categoryId) {
        errors.categoryId = 'Please select a service category';
      }
    } else if (currentStep === 2) {
      if (!formData.title || formData.title.trim().length < 5) {
        errors.title = 'Title must be at least 5 characters long';
      }
      if (!formData.description || formData.description.trim().length < 15) {
        errors.description = 'Please describe the issue in at least 15 characters';
      }
    } else if (currentStep === 3) {
      if (!formData.address || formData.address.trim().length < 3) {
        errors.address = 'Street address is required';
      }
      if (!formData.city || formData.city.trim().length < 2) {
        errors.city = 'City is required';
      }
      if (!formData.postalCode || formData.postalCode.trim().length < 3) {
        errors.postalCode = 'Valid postal code is required';
      }
    } else if (currentStep === 4) {
      if (!formData.preferredDate) {
        errors.preferredDate = 'Preferred service date is required';
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chosen = new Date(formData.preferredDate);
      chosen.setHours(0, 0, 0, 0);
      if (chosen < today) {
        errors.preferredDate = 'Date cannot be in the past';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const payload = {
        categoryId: formData.categoryId,
        title: formData.title,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        state: formData.state,
        preferredDate: formData.preferredDate,
        preferredTime: {
          start: formData.startTime,
          end: formData.endTime,
        },
        requiredSkills: formData.requiredSkills,
      };

      const res = await serviceRequestService.createServiceRequest(payload);
      const newId = res.data?.request?._id;
      navigate(newId ? `/customer/requests/${newId}` : '/customer/requests');
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit service request. Please review your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingCategories) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading available service categories..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Service Request</h1>
          <p className="text-sm text-slate-500 mt-1">
            Step {step} of 5: {
              step === 1 ? 'Select Category' :
              step === 2 ? 'Problem Details' :
              step === 3 ? 'Location' :
              step === 4 ? 'Preferred Schedule' : 'Review & Submit'
            }
          </p>
        </div>
        <Link to="/customer/requests" className="text-sm text-slate-500 hover:text-slate-800">
          Cancel
        </Link>
      </div>

      {/* Progress Stepper Bar */}
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-colors ${
              i <= step ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {submitError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Submission Error</p>
            <p className="mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      {/* STEP 1: CATEGORY SELECTION */}
      {step === 1 && (
        <Card>
          <CardHeader
            title="1. Choose a Service Category"
            subtitle="Select the trade category that best matches your maintenance or repair requirement"
          />
          <CardContent>
            {fieldErrors.categoryId && (
              <p className="text-xs text-red-600 mb-3">{fieldErrors.categoryId}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const IconComponent = iconMap[cat.icon] || Wrench;
                const isSelected = formData.categoryId === cat._id;

                return (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        categoryId: cat._id,
                        requiredSkills: [],
                      }));
                      setFieldErrors((prev) => ({ ...prev, categoryId: '' }));
                    }}
                    className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div
                        className={`p-2.5 rounded-lg ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <Badge variant={isSelected ? 'primary' : 'default'} size="sm">
                        ${cat.startingPrice} {cat.pricingUnit === 'HOURLY' ? '/hr' : 'base'}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {cat.description || 'Verified licensed professional service.'}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleNext} icon={ArrowRight}>
              Continue to Details
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: PROBLEM DETAILS */}
      {step === 2 && (
        <Card>
          <CardHeader
            title="2. Describe the Service Problem"
            subtitle={`Provide specific details for ${selectedCategory?.name || 'your request'}`}
          />
          <CardContent className="space-y-4">
            <Input
              label="Request Title"
              name="title"
              required
              placeholder="e.g. Washing machine leaks water during spin cycle"
              value={formData.title}
              onChange={handleInputChange}
              error={fieldErrors.title}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Detailed Problem Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                rows={5}
                required
                className={`block w-full rounded-lg border text-sm p-3 focus:outline-none focus:ring-2 ${
                  fieldErrors.description
                    ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-blue-200'
                }`}
                placeholder="Describe what happened, any error codes, appliance brand/model, or specific issues noticed..."
                value={formData.description}
                onChange={handleInputChange}
              />
              {fieldErrors.description && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
              )}
            </div>

            {selectedCategory?.requiredSkills?.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Specialized Skills (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedCategory.requiredSkills.map((skill) => {
                    const active = formData.requiredSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => handleSkillToggle(skill)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {skill} {active ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={handleBack} icon={ArrowLeft}>
              Back
            </Button>
            <Button onClick={handleNext} icon={ArrowRight}>
              Continue to Location
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: LOCATION */}
      {step === 3 && (
        <Card>
          <CardHeader
            title="3. Service Location"
            subtitle="Where should the service specialist be dispatched?"
          />
          <CardContent className="space-y-4">
            <Input
              label="Street Address"
              name="address"
              required
              icon={MapPin}
              placeholder="e.g. 124 Main Street, Apt 4B"
              value={formData.address}
              onChange={handleInputChange}
              error={fieldErrors.address}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City"
                name="city"
                required
                placeholder="e.g. Hyderabad"
                value={formData.city}
                onChange={handleInputChange}
                error={fieldErrors.city}
              />

              <Input
                label="State / Province"
                name="state"
                placeholder="e.g. Telangana"
                value={formData.state}
                onChange={handleInputChange}
              />

              <Input
                label="Postal / PIN Code"
                name="postalCode"
                required
                placeholder="e.g. 500001"
                value={formData.postalCode}
                onChange={handleInputChange}
                error={fieldErrors.postalCode}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={handleBack} icon={ArrowLeft}>
              Back
            </Button>
            <Button onClick={handleNext} icon={ArrowRight}>
              Continue to Schedule
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 4: SCHEDULE */}
      {step === 4 && (
        <Card>
          <CardHeader
            title="4. Preferred Schedule"
            subtitle="Choose your preferred appointment date and arrival time window"
          />
          <CardContent className="space-y-4">
            <Input
              label="Preferred Date"
              name="preferredDate"
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              icon={Calendar}
              value={formData.preferredDate}
              onChange={handleInputChange}
              error={fieldErrors.preferredDate}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Arrival Time From"
                name="startTime"
                type="time"
                icon={Clock}
                value={formData.startTime}
                onChange={handleInputChange}
              />

              <Input
                label="Arrival Time Until"
                name="endTime"
                type="time"
                icon={Clock}
                value={formData.endTime}
                onChange={handleInputChange}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={handleBack} icon={ArrowLeft}>
              Back
            </Button>
            <Button onClick={handleNext} icon={ArrowRight}>
              Review Summary
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 5: REVIEW & SUBMIT */}
      {step === 5 && (
        <Card>
          <CardHeader
            title="5. Review Your Request"
            subtitle="Confirm the details below before submitting to verified service providers"
          />
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category & Problem */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-500">Service Category</span>
                  <Badge variant="primary">{selectedCategory?.name}</Badge>
                </div>
                <h4 className="text-base font-bold text-slate-900">{formData.title}</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{formData.description}</p>
                {formData.requiredSkills.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {formData.requiredSkills.map((s) => (
                      <span key={s} className="px-2 py-0.5 text-xs bg-white border rounded text-slate-700">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Location & Time */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-500">Service Location</span>
                  <p className="text-sm font-medium text-slate-900 mt-1">
                    {formData.address}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formData.city}, {formData.state} {formData.postalCode}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-xs font-semibold uppercase text-slate-500">Preferred Timing</span>
                  <p className="text-sm font-medium text-slate-900 mt-1 flex items-center">
                    <Calendar className="h-4 w-4 mr-1.5 text-slate-400" />
                    {new Date(formData.preferredDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center mt-0.5">
                    <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                    {formData.startTime} – {formData.endTime}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Starting Price Est:</span>
                  <span className="font-semibold text-slate-900">
                    ${selectedCategory?.startingPrice} ({selectedCategory?.pricingUnit})
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-blue-600 shrink-0" />
              <span>
                Your request will be submitted with status <strong>SUBMITTED</strong>. Certified service providers in your area will be able to review requirements and provide quotes.
              </span>
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={handleBack} icon={ArrowLeft} disabled={isSubmitting}>
              Back
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting} icon={CheckCircle}>
              Submit Service Request
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default CreateRequestPage;
