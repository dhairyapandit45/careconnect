/**
 * Support Agent Dashboard
 */

import React from 'react';
import { Headphones, AlertTriangle, MessageSquare, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardContent, Badge, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export const SupportDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-darkgreen">Support Operations Desk</h1>
          <p className="text-sm text-darkgreen-muted mt-1">
            Welcome, {user?.name || 'Support Agent'}. Manage dispute resolutions, cancellations, and customer tickets.
          </p>
        </div>
        <Button variant="outline" icon={Headphones}>Active Cases Queue</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-darkgreen-muted uppercase">Open Disputes</p>
                <p className="text-2xl font-bold text-[#B42318] mt-1">3</p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#FDF2F2] text-[#B42318]">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-darkgreen-muted uppercase">Pending Cancellations</p>
                <p className="text-2xl font-bold text-[#92400E] mt-1">2</p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#FFFBEB] text-[#92400E]">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-darkgreen-muted uppercase">Resolved Today</p>
                <p className="text-2xl font-bold text-darkgreen mt-1">8</p>
              </div>
              <div className="p-2.5 rounded-lg bg-[#EAF5EE] text-[#276749]">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-darkgreen-muted uppercase">Avg Response Time</p>
                <p className="text-2xl font-bold text-darkgreen mt-1">14m</p>
              </div>
              <div className="p-2.5 rounded-lg bg-palesage text-forest">
                <Headphones className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Priority Dispute Queue"
          subtitle="Customer and provider escalations requiring support intervention"
        />
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-ivory border border-themeborder">
              <div>
                <p className="text-sm font-semibold text-darkgreen">Dispute #DSP-4019: Incomplete Plumbing Work</p>
                <p className="text-xs text-darkgreen-muted mt-0.5">Raised 2 hours ago • Customer requested refund</p>
              </div>
              <Badge variant="danger">High Priority</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportDashboard;
