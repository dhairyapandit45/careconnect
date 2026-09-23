/**
 * Service Provider Onboarding Wizard
 * Step-by-step onboarding for home service professionals:
 * 1. Business Profile
 * 2. Service Categories
 * 3. Skills & Specializations
 * 4. Service Areas (Cities & Localities)
 * 5. Experience & Background
 * 6. Pricing Structure
 * 7. Verification Documents
 * 8. Review & Submit
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Layers,
  Wrench,
  MapPin,
  Award,
  DollarSign,
  FileCheck,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import categoryService from '../../services/category.service';
import providerService from '../../services/provider.service';
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

const STEPS = [
  { id: 1, title: 'Business Profile', icon: Building2 },
  { id: 2, title: 'Categories', icon: Layers },
  { id: 3, title: 'Skills', icon: Wrench },
  { id: 4, title: 'Service Areas', icon: MapPin },
  { id: 5, title: 'Experience', icon: Award },
  { id: 6, title: 'Pricing', icon: DollarSign },
  { id: 7, title: 'Documents', icon: FileCheck },
  { id: 8, title: 'Review & Submit', icon: CheckCircle },
];

export const ProviderOnboardingWizard = () => {
  const navigate = useNavigate();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isExistingProfile, setIsExistingProfile] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [stepErrors, setStepErrors] = useState({});

  // Catalogs
  const [availableCategories, setAvailableCategories] = useState([]);
  const [suggestedSkills, setSuggestedSkills] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    serviceCategories: [], // Array of category IDs
    skills: [], // Array of skill strings
    serviceAreas: [
      { city: '', areas: [] },
    ],
    experienceYears: 1,
    pricing: {
      model: 'HOURLY',
      minimumCharge: 100,
      hourlyRate: 50,
    },
    documents: [
      { type: 'CERTIFICATION', name: '', url: '' },
    ],
  });

  // Custom input states for tags
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [localityInputs, setLocalityInputs] = useState({});

  // Load existing profile (if any) and active categories
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        setInitialLoading(true);
        // Load categories
        const catRes = await categoryService.getCategories({ isActive: true });
        const categories = catRes.data?.data?.categories || [];
        if (isMounted) {
          setAvailableCategories(categories);
        }

        // Load skills catalog
        try {
          const skillsRes = await providerService.getSkillsCatalog();
          if (isMounted && skillsRes.data?.data?.skills) {
            setSuggestedSkills(skillsRes.data.data.skills);
          }
        } catch {
          // Non-critical if skills catalog fails; will fallback to category suggested skills
        }

        // Check if provider already has profile
        try {
          const profileRes = await providerService.getMyProfile();
          if (isMounted && profileRes.data?.data?.profile) {
            const p = profileRes.data.data.profile;
            setIsExistingProfile(true);
            setFormData({
              businessName: p.businessName || '',
              description: p.description || '',
              serviceCategories: (p.serviceCategories || []).map((cat) =>
                typeof cat === 'object' ? cat._id : cat
              ),
              skills: p.skills || [],
              serviceAreas: p.serviceAreas && p.serviceAreas.length > 0
                ? p.serviceAreas.map((sa) => ({ city: sa.city, areas: sa.areas || [] }))
                : [{ city: '', areas: [] }],
              experienceYears: p.experienceYears || 0,
              pricing: {
                model: p.pricing?.model || 'HOURLY',
                minimumCharge: p.pricing?.minimumCharge || 0,
                hourlyRate: p.pricing?.hourlyRate || 0,
              },
              documents: p.documents && p.documents.length > 0
                ? p.documents.map((d) => ({ type: d.type, name: d.name, url: d.url }))
                : [{ type: 'CERTIFICATION', name: '', url: '' }],
            });
          }
        } catch (profileErr) {
          // 404 is normal for newly registered providers
          if (profileErr.response?.status !== 404) {
            // Log non-404 error
          }
        }
      } catch (err) {
        if (isMounted) {
          setSubmitError(err.response?.data?.message || 'Failed to initialize onboarding wizard');
        }
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Validation per step
  const validateStep = (stepNumber) => {
    const errors = {};

    if (stepNumber === 1) {
      if (!formData.businessName || formData.businessName.trim().length < 2) {
        errors.businessName = 'Business name must be at least 2 characters long';
      }
      if (!formData.description || formData.description.trim().length < 10) {
        errors.description = 'Description must be at least 10 characters long';
      }
    }

    if (stepNumber === 2) {
      if (!formData.serviceCategories || formData.serviceCategories.length === 0) {
        errors.serviceCategories = 'Please select at least one service category';
      }
    }

    if (stepNumber === 3) {
      if (!formData.skills || formData.skills.length === 0) {
        errors.skills = 'Please add or select at least one professional skill';
      }
    }

    if (stepNumber === 4) {
      const validAreas = formData.serviceAreas.filter((sa) => sa.city && sa.city.trim().length >= 2);
      if (validAreas.length === 0) {
        errors.serviceAreas = 'At least one operating city is required';
      }
    }

    if (stepNumber === 5) {
      if (formData.experienceYears === undefined || formData.experienceYears === null || formData.experienceYears < 0) {
        errors.experienceYears = 'Experience years must be 0 or greater';
      }
      if (formData.experienceYears > 60) {
        errors.experienceYears = 'Experience years cannot exceed 60';
      }
    }

    if (stepNumber === 6) {
      if (formData.pricing.minimumCharge < 0) {
        errors.minimumCharge = 'Minimum charge cannot be negative';
      }
      if (formData.pricing.hourlyRate < 0) {
        errors.hourlyRate = 'Hourly rate cannot be negative';
      }
    }

    if (stepNumber === 7) {
      const docs = formData.documents.filter((d) => d.name.trim() || d.url.trim());
      for (let i = 0; i < docs.length; i += 1) {
        if (!docs[i].name.trim()) {
          errors[`doc_name_${i}`] = 'Document name/label is required';
        }
        if (!docs[i].url.trim()) {
          errors[`doc_url_${i}`] = 'Document link/URL is required';
        }
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setSubmitError(null);
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Category toggle
  const toggleCategory = (catId) => {
    setFormData((prev) => {
      const exists = prev.serviceCategories.includes(catId);
      return {
        ...prev,
        serviceCategories: exists
          ? prev.serviceCategories.filter((id) => id !== catId)
          : [...prev.serviceCategories, catId],
      };
    });
  };

  // Skill management
  const addSkill = (skill) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (!formData.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }));
    }
    setCustomSkillInput('');
  };

  const removeSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  // Service Area management
  const updateCity = (index, city) => {
    const updated = [...formData.serviceAreas];
    updated[index].city = city;
    setFormData((prev) => ({ ...prev, serviceAreas: updated }));
  };

  const addAreaTag = (index) => {
    const raw = (localityInputs[index] || '').trim();
    if (!raw) return;
    const updated = [...formData.serviceAreas];
    if (!updated[index].areas.includes(raw)) {
      updated[index].areas = [...updated[index].areas, raw];
    }
    setFormData((prev) => ({ ...prev, serviceAreas: updated }));
    setLocalityInputs((prev) => ({ ...prev, [index]: '' }));
  };

  const removeAreaTag = (cityIndex, tagIndex) => {
    const updated = [...formData.serviceAreas];
    updated[cityIndex].areas = updated[cityIndex].areas.filter((_, idx) => idx !== tagIndex);
    setFormData((prev) => ({ ...prev, serviceAreas: updated }));
  };

  const addCityRow = () => {
    setFormData((prev) => ({
      ...prev,
      serviceAreas: [...prev.serviceAreas, { city: '', areas: [] }],
    }));
  };

  const removeCityRow = (index) => {
    if (formData.serviceAreas.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter((_, idx) => idx !== index),
    }));
  };

  // Document management
  const updateDocument = (index, field, value) => {
    const updated = [...formData.documents];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, documents: updated }));
  };

  const addDocumentRow = () => {
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, { type: 'CERTIFICATION', name: '', url: '' }],
    }));
  };

  const removeDocumentRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, idx) => idx !== index),
    }));
  };

  // Final submission
  const handleSubmit = async () => {
    // Validate all critical steps
    for (let s = 1; s <= 7; s += 1) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const cleanedAreas = formData.serviceAreas
        .filter((sa) => sa.city && sa.city.trim().length >= 2)
        .map((sa) => ({
          city: sa.city.trim(),
          areas: sa.areas,
        }));

      const cleanedDocuments = formData.documents
        .filter((d) => d.name.trim() && d.url.trim())
        .map((d) => ({
          type: d.type,
          name: d.name.trim(),
          url: d.url.trim(),
        }));

      const payload = {
        businessName: formData.businessName.trim(),
        description: formData.description.trim(),
        serviceCategories: formData.serviceCategories,
        skills: formData.skills,
        serviceAreas: cleanedAreas,
        experienceYears: Number(formData.experienceYears),
        pricing: {
          model: formData.pricing.model,
          minimumCharge: Number(formData.pricing.minimumCharge) || 0,
          hourlyRate: Number(formData.pricing.hourlyRate) || 0,
        },
        documents: cleanedDocuments,
      };

      if (isExistingProfile) {
        await providerService.updateProfile(payload);
      } else {
        await providerService.createProfile(payload);
      }

      navigate('/provider/profile', {
        state: { message: 'Provider profile submitted successfully! Your account verification is now pending admin review.' },
      });
    } catch (err) {
      setSubmitError(
        err.response?.data?.message ||
        'Failed to save provider profile. Please verify your details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-slate-600">Loading onboarding wizard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isExistingProfile ? 'Update Business Profile' : 'Service Provider Onboarding'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete your trade credentials and service offerings to get verified and start receiving jobs.
          </p>
        </div>
        <Link to="/provider/dashboard">
          <Button variant="outline" size="sm">Exit to Dashboard</Button>
        </Link>
      </div>

      {/* Step Indicator */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[650px] gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (isCompleted || s.id < currentStep) {
                    setCurrentStep(s.id);
                  }
                }}
                disabled={!isCompleted && s.id > currentStep}
                className={`flex flex-col items-center gap-1.5 flex-1 p-2 rounded-lg text-center transition-all ${
                  isCurrent
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : isCompleted
                    ? 'text-emerald-700 hover:bg-slate-50 cursor-pointer'
                    : 'text-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isCompleted ? '✓' : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-xs truncate w-full">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alert Error */}
      {submitError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-900">Submission Error</h4>
            <p className="text-xs text-red-700 mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      {/* Step 1: Business Profile */}
      {currentStep === 1 && (
        <Card>
          <CardHeader
            title="Business Identification"
            subtitle="Tell customers and administrators about your trade or company."
          />
          <CardContent className="space-y-4">
            <Input
              label="Business / Trade Name"
              placeholder="e.g. Apex Electrical & Plumbing Solutions"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              error={stepErrors.businessName}
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Bio / Professional Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  stepErrors.description ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                }`}
                placeholder="Describe your expertise, work ethics, and customer satisfaction guarantees (minimum 10 characters)..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              {stepErrors.description && (
                <p className="text-xs text-red-600 mt-1">{stepErrors.description}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleNext}>
              Next: Select Categories <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Categories */}
      {currentStep === 2 && (
        <Card>
          <CardHeader
            title="Service Categories"
            subtitle="Choose the service industries you operate in. Only active categories can be selected."
          />
          <CardContent className="space-y-4">
            {stepErrors.serviceCategories && (
              <p className="text-xs text-red-600 font-medium">{stepErrors.serviceCategories}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableCategories.map((cat) => {
                const isSelected = formData.serviceCategories.includes(cat._id);
                return (
                  <div
                    key={cat._id}
                    onClick={() => toggleCategory(cat._id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-semibold text-slate-900 text-sm">{cat.name}</div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Controlled by outer div click
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={handleNext}>
              Next: Professional Skills <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Skills */}
      {currentStep === 3 && (
        <Card>
          <CardHeader
            title="Skills & Specializations"
            subtitle="Highlight specialized certifications, equipment expertise, and trade capabilities."
          />
          <CardContent className="space-y-5">
            {stepErrors.skills && (
              <p className="text-xs text-red-600 font-medium">{stepErrors.skills}</p>
            )}

            {/* Selected Skills Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Selected Skills ({formData.skills.length})
              </label>
              <div className="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                {formData.skills.length === 0 ? (
                  <p className="text-xs text-slate-400 self-center">No skills added yet. Select from below or type a custom skill.</p>
                ) : (
                  formData.skills.map((skill) => (
                    <Badge key={skill} variant="primary" size="md" className="flex items-center gap-1.5 py-1 px-2.5">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-blue-700 hover:text-blue-900 font-bold ml-1"
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Add Custom Skill */}
            <div className="flex gap-2">
              <Input
                placeholder="Add custom skill (e.g. Tankless Water Heater Installation)"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill(customSkillInput);
                  }
                }}
              />
              <Button type="button" onClick={() => addSkill(customSkillInput)}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>

            {/* Suggested / Catalog Skills */}
            {suggestedSkills.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Suggested Industry Skills
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedSkills.map((sk) => {
                    const isAdded = formData.skills.includes(sk);
                    return (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => (isAdded ? removeSkill(sk) : addSkill(sk))}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          isAdded
                            ? 'bg-blue-600 text-white border-blue-600 font-medium'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isAdded ? `✓ ${sk}` : `+ ${sk}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={handleNext}>
              Next: Service Areas <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Service Areas */}
      {currentStep === 4 && (
        <Card>
          <CardHeader
            title="Service Coverage Areas"
            subtitle="Specify the cities and localities where your team can be dispatched."
          />
          <CardContent className="space-y-4">
            {stepErrors.serviceAreas && (
              <p className="text-xs text-red-600 font-medium">{stepErrors.serviceAreas}</p>
            )}

            {formData.serviceAreas.map((sa, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    label={`City / Region #${idx + 1}`}
                    placeholder="e.g. San Francisco or Hyderabad"
                    value={sa.city}
                    onChange={(e) => updateCity(idx, e.target.value)}
                    required
                  />
                  {formData.serviceAreas.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCityRow(idx)}
                      className="text-red-600 hover:bg-red-50 mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Coverage Localities / Sub-areas
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {sa.areas.map((tag, tagIdx) => (
                      <Badge key={tagIdx} variant="secondary" size="sm" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeAreaTag(idx, tagIdx)}
                          className="hover:text-red-700 ml-1"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add locality (e.g. Downtown, Mission, Hitec City)"
                      value={localityInputs[idx] || ''}
                      onChange={(e) =>
                        setLocalityInputs({ ...localityInputs, [idx]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addAreaTag(idx);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => addAreaTag(idx)}>
                      Add Area
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addCityRow}>
              <Plus className="w-4 h-4 mr-1" /> Add Another City
            </Button>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={handleNext}>
              Next: Experience <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 5: Experience */}
      {currentStep === 5 && (
        <Card>
          <CardHeader
            title="Years of Experience & Track Record"
            subtitle="Demonstrate your professional industry tenure."
          />
          <CardContent className="space-y-4">
            <Input
              type="number"
              label="Years of Experience"
              min={0}
              max={60}
              value={formData.experienceYears}
              onChange={(e) => setFormData({ ...formData, experienceYears: parseInt(e.target.value, 10) || 0 })}
              error={stepErrors.experienceYears}
              required
            />
            <p className="text-xs text-slate-500">
              Entering verified industry experience increases customer trust and fast-tracks admin review.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={handleNext}>
              Next: Pricing Structure <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 6: Pricing */}
      {currentStep === 6 && (
        <Card>
          <CardHeader
            title="Pricing & Billing Model"
            subtitle="Configure default service rates and minimum inspection charges."
          />
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pricing Model
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.pricing.model}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pricing: { ...formData.pricing, model: e.target.value },
                  })
                }
              >
                <option value="HOURLY">Hourly Rate (Standard)</option>
                <option value="FIXED">Fixed Price per Service</option>
                <option value="STARTING_FROM">Starting From Base Price</option>
                <option value="QUOTE_REQUIRED">Custom Quote Required</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="number"
                label="Minimum Visit / Call-out Charge ($/₹)"
                min={0}
                value={formData.pricing.minimumCharge}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pricing: {
                      ...formData.pricing,
                      minimumCharge: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                error={stepErrors.minimumCharge}
              />
              <Input
                type="number"
                label="Standard Hourly Rate ($/₹)"
                min={0}
                value={formData.pricing.hourlyRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pricing: {
                      ...formData.pricing,
                      hourlyRate: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                error={stepErrors.hourlyRate}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={handleNext}>
              Next: Verification Documents <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 7: Documents */}
      {currentStep === 7 && (
        <Card>
          <CardHeader
            title="Verification Credentials & Documents"
            subtitle="Submit licenses, certifications, and identification metadata for Platform Admin audit."
          />
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500">
              Provide verifiable document links (e.g. government trade license register, cloud document URL). Platform Admins will inspect these credentials prior to approving your profile.
            </p>

            {formData.documents.map((doc, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">Document #{idx + 1}</span>
                  {formData.documents.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocumentRow(idx)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Document Type
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={doc.type}
                      onChange={(e) => updateDocument(idx, 'type', e.target.value)}
                    >
                      <option value="CERTIFICATION">Professional Certification</option>
                      <option value="BUSINESS_LICENSE">Business / Trade License</option>
                      <option value="IDENTITY">Government Photo ID</option>
                      <option value="ADDRESS_PROOF">Proof of Address</option>
                      <option value="OTHER">Other Proof</option>
                    </select>
                  </div>
                  <div>
                    <Input
                      label="Document Name / Title"
                      placeholder="e.g. Master Electrician License 2026"
                      value={doc.name}
                      onChange={(e) => updateDocument(idx, 'name', e.target.value)}
                      error={stepErrors[`doc_name_${idx}`]}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Document URL / Reference"
                      placeholder="https://docs.careconnect.local/lic_492.pdf"
                      value={doc.url}
                      onChange={(e) => updateDocument(idx, 'url', e.target.value)}
                      error={stepErrors[`doc_url_${idx}`]}
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addDocumentRow}>
              <Plus className="w-4 h-4 mr-1" /> Add Another Document
            </Button>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={handleNext}>
              Review & Submit <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 8: Review & Submit */}
      {currentStep === 8 && (
        <Card>
          <CardHeader
            title="Review Profile Submission"
            subtitle="Verify all business details before submitting to Platform Admins for review."
          />
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Verification Lifecycle Notice</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Once submitted, your verification status will be set to <strong>PENDING</strong>. A Platform Admin will inspect your documents and trade credentials before activating customer booking dispatch.
                </p>
              </div>
            </div>

            {/* Business summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Business Info</span>
                <p className="text-base font-bold text-slate-900 mt-1">{formData.businessName}</p>
                <p className="text-xs text-slate-600 mt-1 line-clamp-3">{formData.description}</p>
                <p className="text-xs text-slate-500 mt-2"><strong>Experience:</strong> {formData.experienceYears} Years</p>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Pricing Configuration</span>
                <p className="text-sm font-semibold text-slate-900 mt-1">Model: {formData.pricing.model}</p>
                <p className="text-xs text-slate-600 mt-1">Minimum Visit Charge: ${formData.pricing.minimumCharge}</p>
                <p className="text-xs text-slate-600">Hourly Labor Rate: ${formData.pricing.hourlyRate}/hr</p>
              </div>
            </div>

            {/* Categories & Skills */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Selected Categories ({formData.serviceCategories.length})</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {formData.serviceCategories.map((catId) => {
                    const found = availableCategories.find((c) => c._id === catId);
                    return (
                      <Badge key={catId} variant="primary">
                        {found?.name || catId}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-500 uppercase">Skills ({formData.skills.length})</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {formData.skills.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Coverage & Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Coverage Cities</span>
                <ul className="text-xs text-slate-700 mt-2 space-y-1">
                  {formData.serviceAreas.filter((sa) => sa.city).map((sa, i) => (
                    <li key={i}>
                      📍 <strong>{sa.city}</strong> {sa.areas.length > 0 ? `(${sa.areas.join(', ')})` : ''}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">Attached Credentials</span>
                <ul className="text-xs text-slate-700 mt-2 space-y-1">
                  {formData.documents.filter((d) => d.name).map((d, i) => (
                    <li key={i}>
                      📄 <strong>{d.type}:</strong> {d.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Submitting Profile...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isExistingProfile ? 'Update & Resubmit Profile' : 'Confirm & Submit for Review'}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default ProviderOnboardingWizard;
