/**
 * Operations Manager Dashboard
 */

import React from 'react';
import { Sliders, Activity, Users, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export const OperationsDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome, {user?.name || 'Operations Manager'}. Monitor marketplace liquidity, booking completion rates, and provider assignments.
          </p>
        </div>
        <Button variant="outline" icon={Sliders}>Filter Region: All</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Live Active Bookings</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">42</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Fulfillment Rate</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">96.8%</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Active Providers</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">118</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Unassigned Requests</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">4</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Marketplace Escalation Monitor"
          subtitle="Real-time operational alerts requiring dispatch or provider reassignment"
        />
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Unmatched Emergency Request: Heating Breakdown</p>
                <p className="text-xs text-slate-500 mt-0.5">Location: Downtown • 45 minutes without provider quote</p>
              </div>
              <Badge variant="warning">Manual Dispatch Required</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationsDashboard;
