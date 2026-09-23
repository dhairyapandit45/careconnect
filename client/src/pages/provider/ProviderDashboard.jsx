/**
 * Service Provider Dashboard Page
 */

import React from 'react';
import { Briefcase, DollarSign, Clock, Star } from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export const ProviderDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Provider Operations Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, {user?.name || 'Service Provider'}. Monitor job requests, quotes, and active bookings.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="success" size="md">● Available for Dispatch</Badge>
          <Button variant="outline" size="sm">Update Schedule</Button>
        </div>
      </div>

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
                <p className="text-xs font-medium text-slate-500 uppercase">Satisfaction Rating</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">4.9 / 5.0</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                <Star className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
