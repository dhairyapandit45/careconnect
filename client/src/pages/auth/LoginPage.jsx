/**
 * Login Page
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Wrench, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card, CardContent } from '../../components/ui';
import { ROLE_DASHBOARD_ROUTES } from '../../constants/roles';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (formError) setFormError('');
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.email || !formData.password) {
      setFormError('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await login(formData.email, formData.password);
      const targetRole = data.user.role;
      const redirectPath = location.state?.from?.pathname || ROLE_DASHBOARD_ROUTES[targetRole] || '/';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = (roleEmail) => {
    setFormData({
      email: roleEmail,
      password: 'Password123!',
    });
    setFormError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <Wrench className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign in to CareConnect
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Home Services Booking & Operations Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card>
          <CardContent>
            {(formError || error) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-sm text-red-800">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                name="email"
                type="email"
                required
                icon={Mail}
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
              />

              <Input
                label="Password"
                name="password"
                type="password"
                required
                icon={Lock}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />

              <Button type="submit" fullWidth isLoading={isSubmitting}>
                Sign In
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
                Quick Demo Accounts (Local Dev)
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleDemoFill('customer@careconnect.local')}
                  className="px-2 py-1 text-left text-slate-600 hover:bg-slate-100 rounded"
                >
                  👤 Customer
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('provider@careconnect.local')}
                  className="px-2 py-1 text-left text-slate-600 hover:bg-slate-100 rounded"
                >
                  🔧 Provider
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('support@careconnect.local')}
                  className="px-2 py-1 text-left text-slate-600 hover:bg-slate-100 rounded"
                >
                  🎧 Support
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('operations@careconnect.local')}
                  className="px-2 py-1 text-left text-slate-600 hover:bg-slate-100 rounded"
                >
                  📊 Operations
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('admin@careconnect.local')}
                  className="px-2 py-1 text-left text-slate-600 hover:bg-slate-100 rounded col-span-2"
                >
                  🛡️ Platform Admin
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:underline">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
