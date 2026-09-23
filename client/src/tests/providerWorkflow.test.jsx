/**
 * Frontend Unit & Integration Tests: Provider Onboarding, Profile & Admin Verification
 * Tests Provider Onboarding Wizard, Provider Profile view/edit, Provider Dashboard status banner,
 * and Platform Admin Verification Console.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import providerService from '../services/provider.service';
import categoryService from '../services/category.service';
import { ProviderOnboardingWizard } from '../pages/provider/ProviderOnboardingWizard';
import { ProviderProfile } from '../pages/provider/ProviderProfile';
import { ProviderDashboard } from '../pages/provider/ProviderDashboard';
import { AdminProvidersPage } from '../pages/admin/AdminProvidersPage';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'user-prov-1',
      name: 'Mario Plumber',
      email: 'mario@plumbing.local',
      role: 'SERVICE_PROVIDER',
    },
    isAuthenticated: true,
  }),
}));

// Mock Services
vi.mock('../services/provider.service', () => ({
  default: {
    getMyProfile: vi.fn(),
    getProfileById: vi.fn(),
    getSkillsCatalog: vi.fn(),
    createProfile: vi.fn(),
    updateProfile: vi.fn(),
    getProvidersAdmin: vi.fn(),
    getProviderAdminById: vi.fn(),
    verifyProviderAdmin: vi.fn(),
  },
}));

vi.mock('../services/category.service', () => ({
  default: {
    getCategories: vi.fn(),
    getCategoryById: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

describe('Milestone 4: Provider Onboarding, Profile & Admin Verification Frontend', () => {
  const mockCategories = [
    {
      _id: '507f1f77bcf86cd799439011',
      name: 'Plumbing Services',
      slug: 'plumbing-services',
      description: 'Pipe repairs, drainage, and bathroom fixtures',
      isActive: true,
    },
    {
      _id: '507f1f77bcf86cd799439012',
      name: 'Electrical Repairs',
      slug: 'electrical-repairs',
      description: 'Wiring and fixture repair',
      isActive: true,
    },
  ];

  const mockProviderProfile = {
    _id: '607f1f77bcf86cd799439099',
    user: {
      _id: 'user-prov-1',
      name: 'Mario Plumber',
      email: 'mario@plumbing.local',
      role: 'SERVICE_PROVIDER',
    },
    businessName: 'Mario Master Plumbing',
    description: 'Expert residential and commercial plumbing solutions for over a decade.',
    experienceYears: 12,
    serviceCategories: [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Plumbing Services',
      },
    ],
    skills: ['Pipe Fitting', 'Drain Clearing', 'Leak Detection'],
    serviceAreas: [
      { city: 'San Francisco', areas: ['Downtown', 'Mission'] },
    ],
    pricing: {
      model: 'HOURLY',
      minimumCharge: 120,
      hourlyRate: 85,
    },
    hourlyRate: 85,
    verificationStatus: 'PENDING',
    verificationNotes: 'Pending identity check by administrator.',
    documents: [
      {
        type: 'CERTIFICATION',
        name: 'Master Plumber License 2026',
        url: 'https://docs.careconnect.local/lic_123.pdf',
      },
    ],
    rating: 4.8,
    reviewCount: 24,
    isAvailable: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. ProviderOnboardingWizard loads categories and renders step 1
  it('1. should render ProviderOnboardingWizard step 1 and validate inputs before advancing', async () => {
    categoryService.getCategories.mockResolvedValue({
      data: { data: { categories: mockCategories } },
    });
    providerService.getMyProfile.mockRejectedValue({ response: { status: 404 } });
    providerService.getSkillsCatalog.mockResolvedValue({
      data: { data: { skills: ['Pipe Fitting', 'Wiring', 'Leak Detection'] } },
    });

    render(
      <MemoryRouter>
        <ProviderOnboardingWizard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Service Provider Onboarding')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e.g. Apex Electrical/i)).toBeInTheDocument();
    });

    // Try to advance without entering required fields
    const nextBtn = screen.getByRole('button', { name: /next: select categories/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/business name must be at least 2 characters/i)).toBeInTheDocument();
    });

    // Fill Business Profile and advance
    fireEvent.change(screen.getByPlaceholderText(/e.g. Apex Electrical/i), {
      target: { value: 'Apex Plumbing Co' },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe your expertise/i), {
      target: { value: 'We offer licensed professional plumbing repairs across the city.' },
    });

    fireEvent.click(nextBtn);

    // Step 2: Categories should be visible
    await waitFor(() => {
      expect(screen.getByText('Service Categories')).toBeInTheDocument();
      expect(screen.getByText('Plumbing Services')).toBeInTheDocument();
      expect(screen.getByText('Electrical Repairs')).toBeInTheDocument();
    });
  });

  // 2. ProviderProfile displays verification status, completeness, and availability toggle
  it('2. should display ProviderProfile with verification badge, completeness, and allow availability toggle', async () => {
    providerService.getMyProfile.mockResolvedValue({
      data: { data: { profile: mockProviderProfile } },
    });
    categoryService.getCategories.mockResolvedValue({
      data: { data: { categories: mockCategories } },
    });
    providerService.updateProfile.mockResolvedValue({
      data: {
        data: {
          profile: { ...mockProviderProfile, isAvailable: false },
        },
      },
    });

    render(
      <MemoryRouter>
        <ProviderProfile />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mario Master Plumbing')).toBeInTheDocument();
      expect(screen.getByText(/verification pending/i)).toBeInTheDocument();
      expect(screen.getByText('12 Years')).toBeInTheDocument();
      expect(screen.getByText('$85/hr')).toBeInTheDocument();
      expect(screen.getByText(/available for jobs/i)).toBeInTheDocument();
    });

    // Toggle availability
    const availBtn = screen.getByTitle(/toggle dispatch availability/i);
    fireEvent.click(availBtn);

    await waitFor(() => {
      expect(providerService.updateProfile).toHaveBeenCalledWith({ isAvailable: false });
    });
  });

  // 3. ProviderProfile allows toggling to edit mode and saving changes
  it('3. should toggle ProviderProfile to edit mode and submit profile updates', async () => {
    providerService.getMyProfile.mockResolvedValue({
      data: { data: { profile: mockProviderProfile } },
    });
    categoryService.getCategories.mockResolvedValue({
      data: { data: { categories: mockCategories } },
    });
    providerService.updateProfile.mockResolvedValue({
      data: {
        data: {
          profile: {
            ...mockProviderProfile,
            businessName: 'Mario Master Plumbing & Heating',
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <ProviderProfile />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mario Master Plumbing')).toBeInTheDocument();
    });

    const editBtn = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Business Details')).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Mario Master Plumbing');
    fireEvent.change(nameInput, { target: { value: 'Mario Master Plumbing & Heating' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(providerService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName: 'Mario Master Plumbing & Heating',
        })
      );
    });
  });

  // 4. ProviderDashboard displays status alert and completeness
  it('4. should render ProviderDashboard with verification pending alert and metrics', async () => {
    providerService.getMyProfile.mockResolvedValue({
      data: { data: { profile: mockProviderProfile } },
    });

    render(
      <MemoryRouter>
        <ProviderDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Provider Operations Center')).toBeInTheDocument();
      expect(screen.getByText(/verification review pending/i)).toBeInTheDocument();
      expect(screen.getByText('Mario Master Plumbing')).toBeInTheDocument();
    });
  });

  // 5. AdminProvidersPage lists providers and opens verification audit modal
  it('5. should render AdminProvidersPage, open audit modal, and allow admin to approve provider', async () => {
    categoryService.getCategories.mockResolvedValue({
      data: { data: { categories: mockCategories } },
    });
    providerService.getProvidersAdmin.mockResolvedValue({
      data: {
        data: {
          items: [mockProviderProfile],
          pagination: { page: 1, limit: 10, total: 1, pages: 1 },
        },
      },
    });
    providerService.getProviderAdminById.mockResolvedValue({
      data: { data: { profile: mockProviderProfile } },
    });
    providerService.verifyProviderAdmin.mockResolvedValue({
      data: {
        data: {
          profile: { ...mockProviderProfile, verificationStatus: 'APPROVED' },
        },
      },
    });

    render(
      <MemoryRouter>
        <AdminProvidersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Provider Verification Console')).toBeInTheDocument();
      expect(screen.getByText('Mario Master Plumbing')).toBeInTheDocument();
    });

    // Open audit modal
    const auditBtn = screen.getByRole('button', { name: /audit & verify/i });
    fireEvent.click(auditBtn);

    await waitFor(() => {
      expect(providerService.getProviderAdminById).toHaveBeenCalledWith(mockProviderProfile._id);
      expect(screen.getByText(/audit provider: mario master plumbing/i)).toBeInTheDocument();
      expect(screen.getByText('Master Plumber License 2026')).toBeInTheDocument();
    });

    // Click Approve Provider action
    const approveBtn = screen.getByRole('button', { name: /approve provider/i });
    fireEvent.click(approveBtn);

    // Confirm transition
    const confirmBtn = screen.getByRole('button', { name: /confirm: approve provider/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(providerService.verifyProviderAdmin).toHaveBeenCalledWith(
        mockProviderProfile._id,
        expect.objectContaining({
          action: 'APPROVE',
        })
      );
    });
  });
});
