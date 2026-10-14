/**
 * Responsive Top Navigation Bar
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../constants/roles';
import Badge from '../ui/Badge';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-themeborder bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-darkgreen-muted hover:bg-ivory hover:text-darkgreen lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/" className="flex items-center space-x-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest text-white shadow-xs shadow-forest/20">
            <Wrench className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-darkgreen">CareConnect</span>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-darkgreen">{user.name}</span>
              <span className="text-xs text-darkgreen-muted">{ROLE_LABELS[user.role] || user.role}</span>
            </div>

            <Badge variant="primary" size="sm" className="hidden md:inline-flex">
              {ROLE_LABELS[user.role] || user.role}
            </Badge>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 rounded-lg border border-themeborder px-3 py-1.5 text-xs font-medium text-darkgreen-muted hover:bg-ivory hover:text-darkgreen transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Link
              to="/login"
              className="text-sm font-medium text-darkgreen-muted hover:text-forest px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-forest px-3.5 py-1.5 text-sm font-medium text-white hover:bg-forest-deep shadow-xs"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
