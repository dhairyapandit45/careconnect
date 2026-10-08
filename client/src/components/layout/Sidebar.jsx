/**
 * Dynamic Role-Based Sidebar Navigation
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  FileText,
  CreditCard,
  Star,
  Clock,
  UserCheck,
  FileCheck,
  Shield,
  Headphones,
  Sliders,
  X,
  Users,
  Briefcase,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || ROLES.CUSTOMER;

  const getNavLinks = () => {
    switch (role) {
      case ROLES.CUSTOMER:
        return [
          { to: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/customer/requests', label: 'My Requests', icon: ClipboardList },
          { to: '/customer/bookings', label: 'Bookings', icon: Calendar },
          { to: '/customer/quotes', label: 'Quotes', icon: FileText },
          { to: '/customer/invoices', label: 'Invoices', icon: CreditCard },
          { to: '/customer/reviews', label: 'Reviews', icon: Star },
        ];
      case ROLES.SERVICE_PROVIDER:
        return [
          { to: '/provider/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/provider/onboarding', label: 'Onboarding Wizard', icon: FileCheck },
          { to: '/provider/requests', label: 'Available Jobs', icon: ClipboardList },
          { to: '/provider/quotes', label: 'My Quotes', icon: FileText },
          { to: '/provider/bookings', label: 'Active Bookings', icon: Calendar },
          { to: '/provider/availability', label: 'Availability', icon: Clock },
          { to: '/provider/profile', label: 'Provider Profile', icon: UserCheck },
        ];
      case ROLES.SUPPORT_AGENT:
        return [
          { to: '/support/dashboard', label: 'Support Queue', icon: Headphones },
        ];
      case ROLES.OPERATIONS_MANAGER:
        return [
          { to: '/operations/dashboard', label: 'Operations Overview', icon: Sliders },
          { to: '/operations/users', label: 'User Management', icon: Users },
          { to: '/operations/providers', label: 'Provider Verification', icon: UserCheck },
          { to: '/operations/bookings', label: 'Bookings Oversight', icon: Calendar },
          { to: '/operations/jobs', label: 'Jobs Oversight', icon: Briefcase },
          { to: '/operations/disputes', label: 'Disputes Queue', icon: AlertTriangle },
          { to: '/operations/support', label: 'Support Tickets', icon: HelpCircle },
        ];
      case ROLES.PLATFORM_ADMIN:
        return [
          { to: '/admin/dashboard', label: 'Admin Control Center', icon: Shield },
          { to: '/admin/users', label: 'User Management', icon: Users },
          { to: '/admin/providers', label: 'Provider Verification', icon: UserCheck },
          { to: '/admin/bookings', label: 'Bookings Oversight', icon: Calendar },
          { to: '/admin/jobs', label: 'Jobs Oversight', icon: Briefcase },
          { to: '/admin/disputes', label: 'Disputes Queue', icon: AlertTriangle },
          { to: '/admin/support', label: 'Support Tickets', icon: HelpCircle },
          { to: '/admin/categories', label: 'Service Categories', icon: Sliders },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 border-r border-slate-200/80 bg-white p-4 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-4 lg:hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
