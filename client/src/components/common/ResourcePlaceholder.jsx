/**
 * Reusable Placeholder View for Planned Sub-Routes
 */

import React from 'react';
import { Card, CardHeader, CardContent, EmptyState } from '../ui';
import { Layers } from 'lucide-react';

export const ResourcePlaceholder = ({
  title,
  subtitle,
  resourceName,
  description = 'This section is mapped in the routing architecture and ready for domain feature implementation.',
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <Card>
        <CardHeader title={`${title} Overview`} subtitle="Current Domain State" />
        <CardContent>
          <EmptyState
            icon={Layers}
            title={`No ${resourceName || title} Records Yet`}
            description={description}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ResourcePlaceholder;
