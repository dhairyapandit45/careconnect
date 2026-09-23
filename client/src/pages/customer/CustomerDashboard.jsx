/**
 * Customer Dashboard Placeholder Page
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent, Button, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export const CustomerDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, {user?.name || 'Customer'}. Manage your home service requests and bookings.
          </p>
        </div>
        <Link to="/customer/requests/new">
          <Button icon={Plus}>Create New Request</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Active Requests</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">2</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Pending Quotes</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">4</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Confirmed Bookings</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">1</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Completed Services</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">7</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent Service Activity"
          subtitle="Real-time status updates for ongoing and scheduled service requests"
        />
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">HVAC Seasonal Tune-Up</p>
                <p className="text-xs text-slate-500 mt-0.5">Scheduled for Tomorrow at 10:00 AM</p>
              </div>
              <Badge variant="primary">Booking Confirmed</Badge>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Kitchen Sink Plumbing Repair</p>
                <p className="text-xs text-slate-500 mt-0.5">3 quotes received from certified providers</p>
              </div>
              <Badge variant="warning">Awaiting Decision</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDashboard;
