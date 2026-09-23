/**
 * Registration Page
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, Mail, Lock, User, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Select, Card, CardContent } from '../../components/ui';
import { ROLES, ROLE_LABELS, ROLE_DASHBOARD_ROUTES } from '../../constants/roles';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: ROLES.CUSTOMER,
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

    if (!formData.name || !formData.email || !formData.password) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await register(formData);
      const targetRole = data.user.role;
      const redirectPath = ROLE_DASHBOARD_ROUTES[targetRole] || '/';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = [
    { value: ROLES.CUSTOMER, label: `Customer (${ROLE_LABELS[ROLES.CUSTOMER]})` },
    { value: ROLES.SERVICE_PROVIDER, label: `Service Provider (${ROLE_LABELS[ROLES.SERVICE_PROVIDER]})` },
    { value: ROLES.SUPPORT_AGENT, label: `Support Agent (${ROLE_LABELS[ROLES.SUPPORT_AGENT]})` },
    { value: ROLES.OPERATIONS_MANAGER, label: `Operations Manager (${ROLE_LABELS[ROLES.OPERATIONS_MANAGER]})` },
    { value: ROLES.PLATFORM_ADMIN, label: `Platform Admin (${ROLE_LABELS[ROLES.PLATFORM_ADMIN]})` },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <Wrench className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Create an Account
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Join CareConnect Home Services Platform
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
                label="Full Name"
                name="name"
                required
                icon={User}
                placeholder="Jane Doe"
                value={formData.name}
                onChange={handleChange}
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                required
                icon={Mail}
                placeholder="jane@example.com"
                value={formData.email}
                onChange={handleChange}
              />

              <Input
                label="Phone Number"
                name="phone"
                icon={Phone}
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={handleChange}
              />

              <Select
                label="Account Role"
                name="role"
                required
                options={roleOptions}
                value={formData.role}
                onChange={handleChange}
              />

              <Input
                label="Password"
                name="password"
                type="password"
                required
                icon={Lock}
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
              />

              <Button type="submit" fullWidth isLoading={isSubmitting}>
                Complete Registration
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
