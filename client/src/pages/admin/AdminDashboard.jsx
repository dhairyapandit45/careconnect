/**
 * Platform Admin Dashboard
 */

import React from 'react';
import { Shield, Users, UserCheck, Layers, FileText } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Administration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Logged in as {user?.name || 'Administrator'}. Governance, provider verification, system configuration, and audit logs.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" icon={FileText} size="sm">Audit Logs</Button>
          <Button variant="primary" icon={UserCheck} size="sm">Review Providers</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total Users</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">1,240</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Pending Verifications</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">12</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Configured Categories</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">8</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">System Security</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">Enforced</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Shield className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Provider Verification Queue"
          subtitle="Trade licenses, identity documents, and background checks awaiting administrative review"
        />
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-900">Apex Electricians LLC</p>
                <p className="text-xs text-slate-500 mt-0.5">Submitted Master Electrician License • Background Check Cleared</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="warning">Pending Review</Badge>
                <Button size="sm" variant="outline">Inspect</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
