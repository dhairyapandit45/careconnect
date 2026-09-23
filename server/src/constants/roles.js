/**
 * User Roles Enum & Constants
 * Defines role levels and authorization classifications across CareConnect.
 */

const ROLES = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  SERVICE_PROVIDER: 'SERVICE_PROVIDER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.CUSTOMER]: [
    'requests:create',
    'requests:read:own',
    'quotes:read:own',
    'bookings:create',
    'bookings:read:own',
    'jobs:track:own',
    'invoices:read:own',
    'reviews:create',
    'disputes:create',
  ],
  [ROLES.SERVICE_PROVIDER]: [
    'profile:manage',
    'skills:manage',
    'availability:manage',
    'requests:read:available',
    'quotes:create',
    'jobs:manage:assigned',
    'invoices:create',
    'evidence:upload',
  ],
  [ROLES.SUPPORT_AGENT]: [
    'cancellations:manage',
    'disputes:read',
    'disputes:manage',
    'refunds:process',
    'communications:manage',
  ],
  [ROLES.OPERATIONS_MANAGER]: [
    'bookings:monitor',
    'providers:assign',
    'escalations:handle',
    'quality:monitor',
  ],
  [ROLES.PLATFORM_ADMIN]: [
    'users:manage',
    'providers:verify',
    'categories:manage',
    'pricing:manage',
    'disputes:admin',
    'audit_logs:read',
  ],
});

module.exports = {
  ROLES,
  ALL_ROLES,
  ROLE_PERMISSIONS,
};
