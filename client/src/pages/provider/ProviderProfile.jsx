/**
 * Service Provider Profile Management Page
 * Displays verified credentials, active categories, service coverage, pricing, and document audit records.
 * Allows providers to update details while preserving platform verification constraints.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  AlertTriangle,
  Clock,
  XCircle,
  Edit3,
  Save,
  X,
  Plus,
  CheckCircle,
  ExternalLink,
  Award,
  MapPin,
  Layers,
  Wrench,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
} from 'lucide-react';
import providerService from '../../services/provider.service';
import categoryService from '../../services/category.service';
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Badge,
  Input,
  LoadingSpinner,
} from '../../components/ui';

const VERIFICATION_BADGES = {
  APPROVED: { variant: 'success', icon: ShieldCheck, text: 'Verified Professional' },
  PENDING: { variant: 'warning', icon: Clock, text: 'Verification Pending' },
  UNDER_REVIEW: { variant: 'primary', icon: Clock, text: 'Under Admin Review' },
  REJECTED: { variant: 'danger', icon: XCircle, text: 'Verification Rejected' },
  SUSPENDED: { variant: 'danger', icon: AlertTriangle, text: 'Account Suspended' },
};

export const ProviderProfile = () => {
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ error: null, success: null });

  // Edit form state
  const [editForm, setEditForm] = useState(null);
  const [newSkill, setNewSkill] = useState('');
  const [newCity, setNewCity] = useState('');

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      const [profileRes, catRes] = await Promise.all([
        providerService.getMyProfile().catch((err) => {
          if (err.response?.status === 404) return null;
          throw err;
        }),
        categoryService.getCategories({ isActive: true }).catch(() => ({ data: { data: { categories: [] } } })),
      ]);

      const prof = profileRes?.data?.data?.profile || null;
      setProfile(prof);
      setCategories(catRes.data?.data?.categories || []);

      if (prof) {
        setEditForm({
          businessName: prof.businessName || '',
          description: prof.description || '',
          experienceYears: prof.experienceYears || 0,
          serviceCategories: (prof.serviceCategories || []).map((c) => (typeof c === 'object' ? c._id : c)),
          skills: [...(prof.skills || [])],
          serviceAreas: (prof.serviceAreas || []).map((sa) => ({ city: sa.city, areas: [...(sa.areas || [])] })),
          pricing: {
            model: prof.pricing?.model || 'HOURLY',
            minimumCharge: prof.pricing?.minimumCharge || 0,
            hourlyRate: prof.pricing?.hourlyRate || 0,
          },
          isAvailable: prof.isAvailable !== false,
        });
      }
    } catch (err) {
      setFeedback({ error: err.response?.data?.message || 'Failed to load provider profile', success: null });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Quick availability toggle
  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      const nextAvailable = !profile.isAvailable;
      const res = await providerService.updateProfile({ isAvailable: nextAvailable });
      setProfile(res.data.data.profile);
      setFeedback({ error: null, success: `Dispatch availability updated to ${nextAvailable ? 'Online' : 'Offline'}` });
    } catch (err) {
      setFeedback({ error: err.response?.data?.message || 'Failed to update dispatch status', success: null });
    }
  };

  // Save edits
  const handleSaveEdits = async () => {
    if (!editForm.businessName.trim()) {
      setFeedback({ error: 'Business name is required', success: null });
      return;
    }
    if (!editForm.description.trim() || editForm.description.trim().length < 10) {
      setFeedback({ error: 'Description must be at least 10 characters long', success: null });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback({ error: null, success: null });

      const res = await providerService.updateProfile({
        businessName: editForm.businessName.trim(),
        description: editForm.description.trim(),
        experienceYears: Number(editForm.experienceYears) || 0,
        serviceCategories: editForm.serviceCategories,
        skills: editForm.skills,
        serviceAreas: editForm.serviceAreas.filter((sa) => sa.city.trim().length > 0),
        pricing: {
          model: editForm.pricing.model,
          minimumCharge: Number(editForm.pricing.minimumCharge) || 0,
          hourlyRate: Number(editForm.pricing.hourlyRate) || 0,
        },
      });

      setProfile(res.data.data.profile);
      setIsEditing(false);
      setFeedback({ error: null, success: 'Provider profile updated successfully.' });
    } catch (err) {
      setFeedback({ error: err.response?.data?.message || 'Failed to update profile', success: null });
    } finally {
      setIsSaving(false);
    }
  };

  // Add skill tag
  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !editForm.skills.includes(trimmed)) {
      setEditForm((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
      setNewSkill('');
    }
  };

  // Remove skill tag
  const handleRemoveSkill = (skillToRemove) => {
    setEditForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  // Add city to serviceAreas
  const handleAddCity = () => {
    const trimmed = newCity.trim();
    if (trimmed && !editForm.serviceAreas.some((sa) => sa.city.toLowerCase() === trimmed.toLowerCase())) {
      setEditForm((prev) => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, { city: trimmed, areas: [] }],
      }));
      setNewCity('');
    }
  };

  // Remove city
  const handleRemoveCity = (cityIndex) => {
    setEditForm((prev) => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter((_, idx) => idx !== cityIndex),
    }));
  };

  // Calculate profile completeness
  const calculateCompleteness = () => {
    if (!profile) return 0;
    let score = 0;
    if (profile.businessName) score += 15;
    if (profile.description && profile.description.length >= 20) score += 15;
    if (profile.serviceCategories && profile.serviceCategories.length > 0) score += 20;
    if (profile.skills && profile.skills.length > 0) score += 15;
    if (profile.serviceAreas && profile.serviceAreas.length > 0) score += 15;
    if (profile.pricing?.hourlyRate > 0 || profile.pricing?.minimumCharge > 0) score += 10;
    if (profile.documents && profile.documents.length > 0) score += 10;
    return Math.min(score, 100);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-slate-600">Loading business profile...</p>
      </div>
    );
  }

  // Not onboarded yet
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <Building2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Complete Your Provider Onboarding</h2>
          <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">
            You haven&apos;t set up your service business profile yet. Complete the onboarding wizard to list your categories, skills, and verification documents.
          </p>
        </div>
        <Link to="/provider/onboarding">
          <Button size="lg" className="inline-flex items-center">
            Start Provider Onboarding <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  const badgeConfig = VERIFICATION_BADGES[profile.verificationStatus] || VERIFICATION_BADGES.PENDING;
  const BadgeIcon = badgeConfig.icon;
  const completeness = calculateCompleteness();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Feedback Banner */}
      {feedback.error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-900">Error</h4>
            <p className="text-xs text-red-700 mt-0.5">{feedback.error}</p>
          </div>
          <button type="button" onClick={() => setFeedback({ ...feedback, error: null })}>
            <X className="w-4 h-4 text-red-600 hover:text-red-800" />
          </button>
        </div>
      )}

      {feedback.success && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-900">{feedback.success}</p>
          </div>
          <button type="button" onClick={() => setFeedback({ ...feedback, success: null })}>
            <X className="w-4 h-4 text-emerald-600 hover:text-emerald-800" />
          </button>
        </div>
      )}

      {/* Admin Verification Notes Banner (if any) */}
      {profile.verificationNotes && (
        <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
          profile.verificationStatus === 'REJECTED'
            ? 'bg-red-50 border-red-200'
            : profile.verificationStatus === 'UNDER_REVIEW'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
            profile.verificationStatus === 'REJECTED' ? 'text-red-600' : 'text-amber-600'
          }`} />
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Platform Admin Feedback / Notes
            </h4>
            <p className="text-xs text-slate-700 mt-1 whitespace-pre-line">
              {profile.verificationNotes}
            </p>
            {profile.verificationStatus === 'REJECTED' && (
              <p className="text-xs font-medium text-red-700 mt-2">
                Please update the required credentials below or via the onboarding wizard to request a re-review.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                {(profile.businessName || profile.user?.name || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {profile.businessName || 'Business Profile'}
                  </h1>
                  <Badge variant={badgeConfig.variant} size="md" className="flex items-center gap-1.5 py-1 px-2.5">
                    <BadgeIcon className="w-3.5 h-3.5" />
                    {badgeConfig.text}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Owner: <span className="text-slate-800 font-medium">{profile.user?.name}</span> ({profile.user?.email})
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>Rating: <strong className="text-slate-700">{profile.rating > 0 ? profile.rating.toFixed(1) : 'New'}</strong> ({profile.reviewCount} reviews)</span>
                  <span>•</span>
                  <span>Experience: <strong className="text-slate-700">{profile.experienceYears} Years</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Availability Toggle */}
              <button
                type="button"
                onClick={handleToggleAvailability}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  profile.isAvailable
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
                title="Toggle dispatch availability"
              >
                {profile.isAvailable ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-emerald-600" />
                    <span>Available for Jobs</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-slate-400" />
                    <span>Offline / Unavailable</span>
                  </>
                )}
              </button>

              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    <X className="w-4 h-4 mr-1.5" /> Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdits} disabled={isSaving}>
                    {isSaving ? <LoadingSpinner size="sm" className="mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit3 className="w-4 h-4 mr-1.5" /> Edit Profile
                  </Button>
                  <Link to="/provider/onboarding">
                    <Button size="sm">Launch Wizard</Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Profile completeness progress */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700">Profile Completeness</span>
              <span className="font-bold text-blue-600">{completeness}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  completeness >= 80 ? 'bg-emerald-500' : completeness >= 50 ? 'bg-blue-600' : 'bg-amber-500'
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Mode vs View Mode */}
      {isEditing ? (
        <Card>
          <CardHeader
            title="Edit Business Details"
            subtitle="Updates will reflect on your public profile immediately. Status changes remain governed by Platform Admins."
          />
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Business Name"
                value={editForm.businessName}
                onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                required
              />
              <Input
                type="number"
                label="Years of Experience"
                min={0}
                max={60}
                value={editForm.experienceYears}
                onChange={(e) => setEditForm({ ...editForm, experienceYears: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business Description</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pricing Model</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  value={editForm.pricing.model}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      pricing: { ...editForm.pricing, model: e.target.value },
                    })
                  }
                >
                  <option value="HOURLY">HOURLY</option>
                  <option value="FIXED">FIXED</option>
                  <option value="STARTING_FROM">STARTING_FROM</option>
                  <option value="QUOTE_REQUIRED">QUOTE_REQUIRED</option>
                </select>
              </div>
              <Input
                type="number"
                label="Minimum Charge ($/₹)"
                value={editForm.pricing.minimumCharge}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    pricing: { ...editForm.pricing, minimumCharge: e.target.value },
                  })
                }
              />
              <Input
                type="number"
                label="Hourly Rate ($/₹)"
                value={editForm.pricing.hourlyRate}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    pricing: { ...editForm.pricing, hourlyRate: e.target.value },
                  })
                }
              />
            </div>

            {/* Skills Edit */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Trade Skills</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editForm.skills.map((skill) => (
                  <Badge key={skill} variant="primary" className="flex items-center gap-1.5">
                    {skill}
                    <button type="button" onClick={() => handleRemoveSkill(skill)} className="hover:text-red-700 ml-1">
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddSkill}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>

            {/* Service Areas Edit */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Service Coverage Cities</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editForm.serviceAreas.map((sa, idx) => (
                  <Badge key={idx} variant="secondary" className="flex items-center gap-1.5">
                    📍 {sa.city}
                    <button type="button" onClick={() => handleRemoveCity(idx)} className="hover:text-red-700 ml-1">
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add city name..."
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCity();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddCity}>
                  <Plus className="w-4 h-4 mr-1" /> Add City
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Business Bio, Categories, Skills (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader title="About the Business" />
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {profile.description || 'No business description provided yet.'}
                </p>
              </CardContent>
            </Card>

            {/* Categories & Skills */}
            <Card>
              <CardHeader title="Services & Capabilities" />
              <CardContent className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Active Categories ({profile.serviceCategories?.length || 0})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(profile.serviceCategories || []).map((cat) => {
                      const name = typeof cat === 'object' ? cat.name : (categories.find((c) => c._id === cat)?.name || cat);
                      return (
                        <Badge key={typeof cat === 'object' ? cat._id : cat} variant="primary" size="md">
                          {name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    <span>Skills & Trade Disciplines ({profile.skills?.length || 0})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(profile.skills || []).map((sk) => (
                      <Badge key={sk} variant="secondary" size="md">
                        {sk}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents & Credentials */}
            <Card>
              <CardHeader
                title="Verified Credentials & Licenses"
                subtitle="Documents audited by Platform Admins during the verification process."
              />
              <CardContent>
                {(!profile.documents || profile.documents.length === 0) ? (
                  <p className="text-xs text-slate-500">No credentials or documents attached.</p>
                ) : (
                  <div className="space-y-3">
                    {profile.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Award className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{doc.name}</p>
                            <p className="text-[11px] text-slate-500 uppercase mt-0.5">{doc.type}</p>
                          </div>
                        </div>
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Link <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Pricing, Coverage, Safety Info (1 col) */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <Card>
              <CardHeader title="Pricing Rates" />
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Billing Model</span>
                  <Badge variant="outline">{profile.pricing?.model || 'HOURLY'}</Badge>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500">Hourly Rate</span>
                  <span className="text-sm font-bold text-slate-900">${profile.pricing?.hourlyRate || profile.hourlyRate || 0}/hr</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Minimum Visit Fee</span>
                  <span className="text-sm font-bold text-slate-900">${profile.pricing?.minimumCharge || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Service Coverage Card */}
            <Card>
              <CardHeader title="Coverage Areas" />
              <CardContent className="space-y-3">
                {(!profile.serviceAreas || profile.serviceAreas.length === 0) ? (
                  <p className="text-xs text-slate-500">No coverage cities listed.</p>
                ) : (
                  profile.serviceAreas.map((sa, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>{sa.city}</span>
                      </div>
                      {sa.areas && sa.areas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sa.areas.map((tag, tagIdx) => (
                            <span key={tagIdx} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Verification Security Note */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Trust & Verification Guard
              </span>
              <p>
                Verification statuses can only be modified by verified Platform Administrators. Rating and review stats are computed from genuine customer feedback.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderProfile;
