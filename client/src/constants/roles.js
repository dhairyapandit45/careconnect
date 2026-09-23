/**
 * Frontend Role Constants & Route Mappings
 */

export const ROLES = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  SERVICE_PROVIDER: 'SERVICE_PROVIDER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.CUSTOMER]: 'Customer',
  [ROLES.SERVICE_PROVIDER]: 'Service Provider',
  [ROLES.SUPPORT_AGENT]: 'Support Agent',
  [ROLES.OPERATIONS_MANAGER]: 'Operations Manager',
  [ROLES.PLATFORM_ADMIN]: 'Platform Admin',
});

export const ROLE_DASHBOARD_ROUTES = Object.freeze({
  [ROLES.CUSTOMER]: '/customer/dashboard',
  [ROLES.SERVICE_PROVIDER]: '/provider/dashboard',
  [ROLES.SUPPORT_AGENT]: '/support/dashboard',
  [ROLES.OPERATIONS_MANAGER]: '/operations/dashboard',
  [ROLES.PLATFORM_ADMIN]: '/admin/dashboard',
});
