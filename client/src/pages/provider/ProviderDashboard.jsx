/**
 * Service Provider Dashboard Page
 * Real-time operational overview with verification status alert, profile completeness, and quick dispatch toggles.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  DollarSign,
  Clock,
  Star,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Layers,
  Wrench,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Badge, LoadingSpinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import providerService from '../../services/provider.service';

export const ProviderDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const res = await providerService.getMyProfile();
        if (isMounted) {
          setProfile(res.data?.data?.profile || null);
        }
      } catch (err) {
        // 404 is expected if provider has not onboarded yet
        if (isMounted && err.response?.status !== 404) {
          // Non-404 error
        }
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleAvailability = async () => {
    if (!profile) return;
    try {
      const nextStatus = !profile.isAvailable;
      const res = await providerService.updateProfile({ isAvailable: nextStatus });
      setProfile(res.data.data.profile);
    } catch {
      // Failed to toggle
    }
  };

  // Profile completeness calculation
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

  const completeness = calculateCompleteness();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Provider Operations Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, {user?.name || 'Service Provider'}. Monitor verification status, job dispatches, and incoming requests.
          </p>
        </div>
        {profile && (
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleToggleAvailability}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                profile.isAvailable
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {profile.isAvailable ? (
                <>
                  <ToggleRight className="w-4 h-4 text-emerald-600" />
                  <span>Available for Dispatch</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-slate-400" />
                  <span>Dispatch Offline</span>
                </>
              )}
            </button>
            <Link to="/provider/profile">
              <Button variant="outline" size="sm">Manage Profile</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Verification Status Alert Banner */}
      {isLoadingProfile ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <LoadingSpinner size="sm" />
          <span className="text-xs text-slate-600 font-medium">Checking provider verification status...</span>
        </div>
      ) : !profile ? (
        <div className="p-5 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-blue-900">Onboarding Incomplete</h4>
              <p className="text-xs text-blue-700 mt-0.5">
                Set up your business credentials, service areas, and license documents to qualify for home service bookings.
              </p>
            </div>
          </div>
          <Link to="/provider/onboarding">
            <Button size="sm" className="whitespace-nowrap">
              Start Onboarding <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      ) : profile.verificationStatus === 'APPROVED' ? (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-emerald-900">Verified Service Provider</span>
              <p className="text-xs text-emerald-700">Your credentials and business profile have been approved by Platform Administration.</p>
            </div>
          </div>
          <Badge variant="success">Verified</Badge>
        </div>
      ) : profile.verificationStatus === 'REJECTED' ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900">Verification Requires Correction</h4>
              <p className="text-xs text-red-700 mt-0.5">
                {profile.verificationNotes || 'Your submitted documents did not pass admin review. Please update your profile.'}
              </p>
            </div>
          </div>
          <Link to="/provider/onboarding">
            <Button size="sm" variant="danger">
              Update & Resubmit
            </Button>
          </Link>
        </div>
      ) : profile.verificationStatus === 'SUSPENDED' ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-red-900">Account Suspended</h4>
            <p className="text-xs text-red-700 mt-0.5">
              Your service provider account is temporarily suspended. Please reach out to customer support for resolution.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {profile.verificationStatus === 'UNDER_REVIEW' ? 'Profile Under Admin Review' : 'Verification Review Pending'}
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Your credentials are in queue for administrative review. You will be notified once verified.
              </p>
            </div>
          </div>
          <Link to="/provider/profile">
            <Button size="sm" variant="outline">
              Review Profile Details
            </Button>
          </Link>
        </div>
      )}

      {/* Profile Overview & Completeness Card (if profile exists) */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-2">
            <CardHeader
              title={profile.businessName || 'Business Profile'}
              subtitle={`${profile.experienceYears} Years Experience • Base Rate: $${profile.pricing?.hourlyRate || profile.hourlyRate || 0}/hr`}
            />
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(profile.serviceCategories || []).map((cat) => (
                  <Badge key={typeof cat === 'object' ? cat._id : cat} variant="primary" className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {typeof cat === 'object' ? cat.name : cat}
                  </Badge>
                ))}
                {(profile.skills || []).map((sk) => (
                  <Badge key={sk} variant="secondary" className="flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    {sk}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Profile Status" subtitle="Readiness for customer dispatch" />
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Completeness</span>
                <span className="font-bold text-blue-600">{completeness}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <div className="pt-2 text-xs text-slate-500">
                {completeness === 100 ? (
                  <span className="text-emerald-600 font-semibold">✓ All credential sections complete</span>
                ) : (
                  <span>Add remaining documents & license info to hit 100%</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Operational Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">New Leads</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">5</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Active Jobs</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">2</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Earnings (M-T-D)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">$2,450</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Rating</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {profile && profile.rating > 0 ? `${profile.rating.toFixed(1)} / 5.0` : 'New'}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                <Star className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dispatches & Appointments */}
      <Card>
        <CardHeader
          title="Upcoming Dispatches & Appointments"
          subtitle="Jobs scheduled for today and this week"
        />
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Electrical Panel Inspection</p>
                <p className="text-xs text-slate-500 mt-0.5">Today at 2:00 PM • 124 Maple St</p>
              </div>
              <Badge variant="primary">Dispatched</Badge>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Commercial AC Maintenance</p>
                <p className="text-xs text-slate-500 mt-0.5">Tomorrow at 9:00 AM • 450 Commerce Blvd</p>
              </div>
              <Badge variant="success">Confirmed</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderDashboard;
