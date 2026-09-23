/**
 * Frontend Unit & Component Tests: Service Categories & Service Request Workflow
 * Tests Category Administration, Multi-Step Request Wizard, Customer Requests List, and Detail views.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import categoryService from '../services/category.service';
import serviceRequestService from '../services/serviceRequest.service';
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage';
import { CreateRequestPage } from '../pages/customer/CreateRequestPage';
import { CustomerRequests } from '../pages/customer/CustomerRequests';
import { RequestDetailPage } from '../pages/customer/RequestDetailPage';

// Mock services
vi.mock('../services/category.service', () => ({
  default: {
    getCategories: vi.fn(),
    getCategoryById: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

vi.mock('../services/serviceRequest.service', () => ({
  default: {
    createServiceRequest: vi.fn(),
    getServiceRequests: vi.fn(),
    getServiceRequestById: vi.fn(),
  },
}));

describe('Milestone 3: Service Categories & Customer Request Workflow Frontend', () => {
  const mockCategories = [
    {
      _id: 'cat-1',
      name: 'Plumbing Services',
      slug: 'plumbing-services',
      description: 'Pipe repairs and fixtures',
      icon: 'Droplets',
      startingPrice: 70,
      pricingUnit: 'HOURLY',
      requiredSkills: ['pipe fitting', 'leak inspection'],
      isActive: true,
    },
    {
      _id: 'cat-2',
      name: 'Electrical Work',
      slug: 'electrical-work',
      description: 'Wiring and breaker repairs',
      icon: 'Zap',
      startingPrice: 85,
      pricingUnit: 'HOURLY',
      requiredSkills: ['wiring', 'breaker replacement'],
      isActive: true,
    },
  ];

  const mockServiceRequests = [
    {
      _id: 'req-12345678',
      title: 'Kitchen Sink Leaking Under Cabinet',
      description: 'Continuous dripping water from the P-trap whenever water runs.',
      status: 'SUBMITTED',
      createdAt: '2026-09-23T10:00:00.000Z',
      preferredDate: '2026-09-25T00:00:00.000Z',
      preferredTime: { start: '09:00', end: '12:00' },
      location: {
        address: '100 Main Street',
        city: 'Springfield',
        postalCode: '62701',
        state: 'IL',
      },
      category: mockCategories[0],
      requiredSkills: ['pipe fitting'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. AdminCategoriesPage renders categories
  it('1. should render AdminCategoriesPage with loaded category list', async () => {
    categoryService.getCategories.mockResolvedValue({
      data: { categories: mockCategories },
    });

    render(
      <MemoryRouter>
        <AdminCategoriesPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading categories/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Plumbing Services')).toBeInTheDocument();
      expect(screen.getByText('Electrical Work')).toBeInTheDocument();
      expect(screen.getByText('/plumbing-services')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /add category/i })).toBeInTheDocument();
  });

  // 2. CreateRequestPage loads categories and steps through wizard
  it('2. should step through CreateRequestPage wizard and submit a request', async () => {
    categoryService.getCategories.mockResolvedValue({
      data: { categories: mockCategories },
    });

    serviceRequestService.createServiceRequest.mockResolvedValue({
      data: {
        request: {
          _id: 'req-999',
          title: 'Emergency Pipe Repair',
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/customer/requests/new']}>
        <Routes>
          <Route path="/customer/requests/new" element={<CreateRequestPage />} />
          <Route path="/customer/requests" element={<div>My Requests List Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Step 1: Category selection
    await waitFor(() => {
      expect(screen.getByText('Plumbing Services')).toBeInTheDocument();
    });

    // Advance to Step 2: Problem Description
    fireEvent.click(screen.getByRole('button', { name: /continue to details/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/request title/i)).toBeInTheDocument();
    });

    // Fill Title and Description
    fireEvent.change(screen.getByLabelText(/request title/i), {
      target: { value: 'Fix Major Pipe Leak Under Sink' },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe what happened/i), {
      target: { value: 'The pipe has a noticeable crack and is spraying water inside the kitchen cabinet.' },
    });

    // Advance to Step 3: Service Location
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
    });

    // Fill Address, City, Postal Code
    fireEvent.change(screen.getByLabelText(/street address/i), {
      target: { value: '742 Evergreen Terrace' },
    });
    fireEvent.change(screen.getByLabelText(/city/i), {
      target: { value: 'Springfield' },
    });
    fireEvent.change(screen.getByLabelText(/postal/i), {
      target: { value: '62704' },
    });

    // Advance to Step 4: Schedule Preference
    fireEvent.click(screen.getByRole('button', { name: /continue to schedule/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/preferred date/i)).toBeInTheDocument();
    });

    // Advance to Step 5: Review & Submit
    fireEvent.click(screen.getByRole('button', { name: /review summary/i }));

    await waitFor(() => {
      expect(screen.getByText(/5\. Review Your Request/i)).toBeInTheDocument();
      expect(screen.getByText('Fix Major Pipe Leak Under Sink')).toBeInTheDocument();
    });

    // Submit Request
    fireEvent.click(screen.getByRole('button', { name: /submit service request/i }));

    await waitFor(() => {
      expect(serviceRequestService.createServiceRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'cat-1',
          title: 'Fix Major Pipe Leak Under Sink',
          address: '742 Evergreen Terrace',
          city: 'Springfield',
          postalCode: '62704',
        })
      );
    });
  });

  // 3. CustomerRequests list rendering
  it('3. should display submitted customer service requests in CustomerRequests table', async () => {
    serviceRequestService.getServiceRequests.mockResolvedValue({
      data: {
        items: mockServiceRequests,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
    });

    render(
      <MemoryRouter>
        <CustomerRequests />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Kitchen Sink Leaking Under Cabinet')).toBeInTheDocument();
      expect(screen.getByText('SUBMITTED')).toBeInTheDocument();
      expect(screen.getByText('Springfield')).toBeInTheDocument();
      expect(screen.getByText('62701')).toBeInTheDocument();
    });
  });

  // 4. RequestDetailPage rendering
  it('4. should display full service request details in RequestDetailPage', async () => {
    serviceRequestService.getServiceRequestById.mockResolvedValue({
      data: { request: mockServiceRequests[0] },
    });

    render(
      <MemoryRouter initialEntries={['/customer/requests/req-12345678']}>
        <Routes>
          <Route path="/customer/requests/:id" element={<RequestDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Kitchen Sink Leaking Under Cabinet')).toBeInTheDocument();
      expect(screen.getByText(/continuous dripping water from the p-trap/i)).toBeInTheDocument();
      expect(screen.getByText('100 Main Street')).toBeInTheDocument();
      expect(screen.getByText('Springfield, IL')).toBeInTheDocument();
      expect(screen.getByText('Plumbing Services')).toBeInTheDocument();
      expect(screen.getByText(/request submitted/i)).toBeInTheDocument();
    });
  });
});
