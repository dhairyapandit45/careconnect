/**
 * Frontend Test Suite: Milestone 10 — AI Classification & Provider Matching UI
 * Tests:
 * 1. AI Category Assistant on CreateRequestPage (input, classification trigger, prediction display, applying recommendation)
 * 2. Step 2 AI Category Verification Tool
 * 3. AI Recommended Providers Section on CustomerRequestQuotesPage (fetching, composite score badges, explainability cards, empty state)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import categoryService from '../services/category.service';
import serviceRequestService from '../services/serviceRequest.service';
import quoteService from '../services/quote.service';
import { aiService } from '../services/ai.service';
import { CreateRequestPage } from '../pages/customer/CreateRequestPage';
import { CustomerRequestQuotesPage } from '../pages/customer/CustomerRequestQuotesPage';

// Mock backend API services
vi.mock('../services/category.service', () => ({
  default: {
    getCategories: vi.fn(),
  },
}));

vi.mock('../services/serviceRequest.service', () => ({
  default: {
    createServiceRequest: vi.fn(),
    getServiceRequestById: vi.fn(),
  },
}));

vi.mock('../services/quote.service', () => ({
  default: {
    getQuotesForRequest: vi.fn(),
  },
}));

vi.mock('../services/ai.service', () => ({
  aiService: {
    classifyRequest: vi.fn(),
    matchProviders: vi.fn(),
  },
}));

describe('Milestone 10: AI Classification & Provider Matching UI Tests', () => {
  const mockCategories = [
    {
      _id: 'cat-plumbing-101',
      name: 'Plumbing',
      slug: 'plumbing',
      description: 'Leak detection, pipe repairs, drain cleaning',
      icon: 'Droplets',
      startingPrice: 75,
      pricingUnit: 'STARTING_FROM',
      requiredSkills: ['Master Plumber', 'Pipe Soldering'],
      isActive: true,
    },
    {
      _id: 'cat-electrical-102',
      name: 'Electrical',
      slug: 'electrical',
      description: 'Breaker panels, wiring, and outlets',
      icon: 'Zap',
      startingPrice: 85,
      pricingUnit: 'HOURLY',
      requiredSkills: ['Licensed Electrician'],
      isActive: true,
    },
  ];

  const mockServiceRequest = {
    _id: 'req-ai-test-1',
    title: 'Severe pipe leakage under bathroom sink',
    description: 'Water has been leaking all morning and creating a large puddle.',
    category: {
      _id: 'cat-plumbing-101',
      name: 'Plumbing',
    },
    location: {
      address: '123 MG Road',
      city: 'Bangalore',
      postalCode: '560001',
    },
    preferredDate: '2026-03-20T00:00:00.000Z',
    status: 'SUBMITTED',
  };

  const mockAiMatchProviders = [
    {
      providerId: 'user-prov-1',
      profileId: 'prof-prov-1',
      name: 'Aarav Sharma',
      businessName: 'Aarav Rapid Plumbing',
      rating: 4.9,
      reviewCount: 24,
      experienceYears: 6,
      completedJobsCount: 18,
      compositeScore: 96,
      cityMatch: true,
      explanation: '96% Match — Aarav Rapid Plumbing is a verified specialist servicing Bangalore with 4.9★ rating.',
      pricing: { model: 'HOURLY', hourlyRate: 85 },
    },
    {
      providerId: 'user-prov-2',
      profileId: 'prof-prov-2',
      name: 'Bhavin Patel',
      businessName: 'Bhavin Plumbing Works',
      rating: 4.2,
      reviewCount: 8,
      experienceYears: 3,
      completedJobsCount: 5,
      compositeScore: 82,
      cityMatch: true,
      explanation: '82% Match — Bhavin Plumbing Works is a verified specialist servicing Bangalore with 4.2★ rating.',
      pricing: { model: 'HOURLY', hourlyRate: 65 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    categoryService.getCategories.mockResolvedValue({
      data: { categories: mockCategories },
    });
  });

  // -------------------------------------------------------------------------
  // 1. CREATE REQUEST PAGE — AI CATEGORY ASSISTANT
  // -------------------------------------------------------------------------
  describe('CreateRequestPage — AI Category Assistant', () => {
    it('1. should render the AI Category Assistant widget on Step 1', async () => {
      render(
        <MemoryRouter>
          <CreateRequestPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('CareConnect AI Category Assistant')).toBeInTheDocument();
      });

      expect(
        screen.getByPlaceholderText(/Water is leaking from the pipe/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /AI Classify/i })).toBeInTheDocument();
    });

    it('2. should classify request text and display recommendation with confidence and explanation', async () => {
      aiService.classifyRequest.mockResolvedValueOnce({
        data: {
          data: {
            categoryId: 'cat-plumbing-101',
            categoryName: 'Plumbing',
            categorySlug: 'plumbing',
            confidence: 0.94,
            confidenceLevel: 'HIGH',
            explanation: "CareConnect AI identified key domain indicators ['pipe', 'leak'] strongly aligning with Plumbing.",
            isFallback: false,
          },
        },
      });

      render(
        <MemoryRouter>
          <CreateRequestPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('CareConnect AI Category Assistant')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Water is leaking from the pipe/i);
      fireEvent.change(input, { target: { value: 'Dripping drain pipe in the bathroom' } });

      const classifyBtn = screen.getByRole('button', { name: /AI Classify/i });
      fireEvent.click(classifyBtn);

      await waitFor(() => {
        expect(aiService.classifyRequest).toHaveBeenCalledWith({
          text: 'Dripping drain pipe in the bathroom',
        });
      });

      // Verification of displayed AI prediction
      await waitFor(() => {
        expect(screen.getByText('94% Confidence')).toBeInTheDocument();
        expect(screen.getByText(/strongly aligning with Plumbing/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Apply Category/i })).toBeInTheDocument();
      });
    });

    it('3. should select the recommended category when clicking Apply Category', async () => {
      aiService.classifyRequest.mockResolvedValueOnce({
        data: {
          data: {
            categoryId: 'cat-electrical-102',
            categoryName: 'Electrical',
            categorySlug: 'electrical',
            confidence: 0.88,
            confidenceLevel: 'HIGH',
            explanation: 'CareConnect AI identified circuit and spark indicators.',
            isFallback: false,
          },
        },
      });

      render(
        <MemoryRouter>
          <CreateRequestPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('CareConnect AI Category Assistant')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Water is leaking from the pipe/i);
      fireEvent.change(input, { target: { value: 'Sparking outlet in the hallway' } });
      fireEvent.click(screen.getByRole('button', { name: /AI Classify/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Apply Category/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Apply Category/i }));

      // Advance to Step 2 to verify selected category subtitle
      fireEvent.click(screen.getByRole('button', { name: /Continue to Details/i }));

      await waitFor(() => {
        expect(screen.getByText(/Provide specific details for Electrical/i)).toBeInTheDocument();
      });
    });

    it('4. should render Step 2 AI category check and handle confirmation', async () => {
      aiService.classifyRequest.mockResolvedValueOnce({
        data: {
          data: {
            categoryId: 'cat-plumbing-101',
            categoryName: 'Plumbing',
            confidence: 0.95,
          },
        },
      });

      render(
        <MemoryRouter>
          <CreateRequestPage />
        </MemoryRouter>
      );

      // Advance to Step 2
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Continue to Details/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Continue to Details/i }));

      await waitFor(() => {
        expect(screen.getByText(/Check Category with AI/i)).toBeInTheDocument();
      });

      // Fill in title and description
      const titleInput = screen.getByLabelText(/Request Title/i);
      const descInput = screen.getByLabelText(/Detailed Problem Description/i);
      fireEvent.change(titleInput, { target: { value: 'Leaking pipe under kitchen sink' } });
      fireEvent.change(descInput, { target: { value: 'Water continuously dripping from p-trap onto floor.' } });

      const checkAiBtn = screen.getByRole('button', { name: /Check Category with AI/i });
      fireEvent.click(checkAiBtn);

      await waitFor(() => {
        expect(aiService.classifyRequest).toHaveBeenCalledWith({
          title: 'Leaking pipe under kitchen sink',
          description: 'Water continuously dripping from p-trap onto floor.',
        });
        expect(screen.getByText(/matches/i)).toBeInTheDocument();
        expect(screen.getByText(/95% confidence/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // 2. CUSTOMER REQUEST QUOTES PAGE — AI PROVIDER RECOMMENDATIONS
  // -------------------------------------------------------------------------
  describe('CustomerRequestQuotesPage — AI Recommended Providers', () => {
    it('5. should fetch and render AI Recommended Providers with composite scores and rationale', async () => {
      serviceRequestService.getServiceRequestById.mockResolvedValueOnce({
        data: { request: mockServiceRequest },
      });
      quoteService.getQuotesForRequest.mockResolvedValueOnce({
        data: { items: [] },
      });
      aiService.matchProviders.mockResolvedValueOnce({
        data: {
          data: {
            providers: mockAiMatchProviders,
            totalEligible: 2,
          },
        },
      });

      render(
        <MemoryRouter initialEntries={['/customer/requests/req-ai-test-1/quotes']}>
          <Routes>
            <Route
              path="/customer/requests/:id/quotes"
              element={<CustomerRequestQuotesPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('AI Recommended Providers')).toBeInTheDocument();
      });

      expect(aiService.matchProviders).toHaveBeenCalledWith({
        categoryId: 'cat-plumbing-101',
        city: 'Bangalore',
        preferredDate: '2026-03-20T00:00:00.000Z',
      });

      // Renders provider match cards
      await waitFor(() => {
        expect(screen.getByText('Aarav Rapid Plumbing')).toBeInTheDocument();
        expect(screen.getByText('96% Match')).toBeInTheDocument();
        expect(screen.getByText(/Aarav Rapid Plumbing is a verified specialist/i)).toBeInTheDocument();
        expect(screen.getByText('Bhavin Plumbing Works')).toBeInTheDocument();
        expect(screen.getByText('82% Match')).toBeInTheDocument();
      });
    });

    it('6. should render empty state message when no matching providers are found', async () => {
      serviceRequestService.getServiceRequestById.mockResolvedValueOnce({
        data: { request: mockServiceRequest },
      });
      quoteService.getQuotesForRequest.mockResolvedValueOnce({
        data: { items: [] },
      });
      aiService.matchProviders.mockResolvedValueOnce({
        data: {
          data: {
            providers: [],
            totalEligible: 0,
            message: 'No verified providers currently matching this category in your area.',
          },
        },
      });

      render(
        <MemoryRouter initialEntries={['/customer/requests/req-ai-test-1/quotes']}>
          <Routes>
            <Route
              path="/customer/requests/:id/quotes"
              element={<CustomerRequestQuotesPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('AI Recommended Providers')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(
          screen.getByText(/No verified providers currently matching this category in your area/i)
        ).toBeInTheDocument();
      });
    });
  });
});
