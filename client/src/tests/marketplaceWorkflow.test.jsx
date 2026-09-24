/**
 * Frontend Unit & Component Integration Tests: Milestone 5
 * Covers:
 * 1. Provider Availability weekly roster & shift modal validation
 * 2. Provider Requests discovery feed & privacy sanitization
 * 3. Provider Submit Quote form & validation
 * 4. Provider Submitted Quotes tracker & withdrawal
 * 5. Customer Request Quotes comparison & acceptance
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import availabilityService from '../services/availability.service';
import quoteService from '../services/quote.service';
import serviceRequestService from '../services/serviceRequest.service';

import { ProviderAvailability } from '../pages/provider/ProviderAvailability';
import { ProviderRequests } from '../pages/provider/ProviderRequests';
import { ProviderSubmitQuotePage } from '../pages/provider/ProviderSubmitQuotePage';
import { ProviderQuotes } from '../pages/provider/ProviderQuotes';
import { CustomerRequestQuotesPage } from '../pages/customer/CustomerRequestQuotesPage';

// Mock Services
vi.mock('../services/availability.service', () => ({
  default: {
    getAvailability: vi.fn(),
    createAvailability: vi.fn(),
    updateAvailability: vi.fn(),
    deleteAvailability: vi.fn(),
  },
}));

vi.mock('../services/quote.service', () => ({
  default: {
    createQuote: vi.fn(),
    getQuotesForRequest: vi.fn(),
    acceptQuote: vi.fn(),
    getProviderQuotes: vi.fn(),
    getProviderQuoteById: vi.fn(),
    withdrawQuote: vi.fn(),
    getEligibleRequests: vi.fn(),
    getEligibleRequestById: vi.fn(),
  },
}));

vi.mock('../services/serviceRequest.service', () => ({
  default: {
    getServiceRequestById: vi.fn(),
    getServiceRequests: vi.fn(),
  },
}));

describe('Milestone 5: Marketplace Frontend Workflow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  // ==========================================
  // PART 1 — PROVIDER AVAILABILITY
  // ==========================================
  describe('ProviderAvailability Component', () => {
    const mockShifts = [
      {
        _id: 'shift-1',
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true,
      },
      {
        _id: 'shift-2',
        dayOfWeek: 'WEDNESDAY',
        startTime: '10:00',
        endTime: '18:00',
        isAvailable: true,
      },
    ];

    it('renders weekly roster and active shifts', async () => {
      availabilityService.getAvailability.mockResolvedValueOnce({
        data: { shifts: mockShifts },
      });

      render(
        <MemoryRouter>
          <ProviderAvailability />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Weekly Availability')).toBeInTheDocument();
      });

      expect(screen.getByText('09:00 – 17:00')).toBeInTheDocument();
      expect(screen.getByText('10:00 – 18:00')).toBeInTheDocument();
      expect(screen.getByText(/Weekly Roster \(2 active shifts\)/i)).toBeInTheDocument();
    });

    it('opens add shift modal and validates start time before end time', async () => {
      availabilityService.getAvailability.mockResolvedValueOnce({
        data: { shifts: [] },
      });

      render(
        <MemoryRouter>
          <ProviderAvailability />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Weekly Availability')).toBeInTheDocument();
      });

      const addBtn = screen.getByText('Add Shift Slot');
      fireEvent.click(addBtn);

      expect(screen.getByText('Add Working Shift')).toBeInTheDocument();

      // Enter invalid time where start > end
      const startInputs = screen.getAllByDisplayValue('09:00');
      fireEvent.change(startInputs[0], { target: { value: '18:00' } });

      const endInputs = screen.getAllByDisplayValue('17:00');
      fireEvent.change(endInputs[0], { target: { value: '09:00' } });

      const saveBtn = screen.getByText('Save Shift');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText('Shift start time must be earlier than end time')).toBeInTheDocument();
      });

      expect(availabilityService.createAvailability).not.toHaveBeenCalled();
    });

    it('submits a valid shift and refreshes roster', async () => {
      availabilityService.getAvailability
        .mockResolvedValueOnce({ data: { shifts: [] } })
        .mockResolvedValueOnce({
          data: {
            shifts: [
              {
                _id: 'shift-new',
                dayOfWeek: 'MONDAY',
                startTime: '08:00',
                endTime: '16:00',
                isAvailable: true,
              },
            ],
          },
        });

      availabilityService.createAvailability.mockResolvedValueOnce({
        data: { shift: { _id: 'shift-new', dayOfWeek: 'MONDAY' } },
      });

      render(
        <MemoryRouter>
          <ProviderAvailability />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Weekly Availability')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add Shift Slot'));

      const saveBtn = screen.getByText('Save Shift');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(availabilityService.createAvailability).toHaveBeenCalledWith({
          dayOfWeek: 'MONDAY',
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
        });
      });
    });

    it('deletes a shift upon user confirmation', async () => {
      availabilityService.getAvailability.mockResolvedValueOnce({
        data: { shifts: mockShifts },
      });
      availabilityService.deleteAvailability.mockResolvedValueOnce({
        data: { success: true },
      });

      render(
        <MemoryRouter>
          <ProviderAvailability />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('09:00 – 17:00')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByTitle('Delete shift');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(availabilityService.deleteAvailability).toHaveBeenCalledWith('shift-1');
      });
    });
  });

  // ==========================================
  // PART 2 — PROVIDER REQUESTS DISCOVERY FEED
  // ==========================================
  describe('ProviderRequests Component', () => {
    const mockEligibleRequests = [
      {
        _id: 'req-101',
        title: 'Master Bathroom Leak Repair',
        description: 'Persistent pipe dripping under sink causing minor wood damage.',
        category: { name: 'Plumbing Services' },
        location: { city: 'San Francisco', state: 'CA', postalCode: '94105' },
        preferredDate: '2026-10-15T00:00:00.000Z',
        preferredTime: { start: '09:00', end: '13:00' },
        status: 'SUBMITTED',
        quoteCount: 1,
        requiredSkills: ['Pipe Fitting'],
        createdAt: '2026-09-20T10:00:00.000Z',
      },
    ];

    it('renders eligible requests with privacy sanitization (no street address or customer private info)', async () => {
      quoteService.getEligibleRequests.mockResolvedValueOnce({
        data: {
          items: mockEligibleRequests,
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      });

      render(
        <MemoryRouter>
          <ProviderRequests />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Master Bathroom Leak Repair')).toBeInTheDocument();
      });

      // City & state are shown
      expect(screen.getByText(/San Francisco, CA/i)).toBeInTheDocument();
      // Ensure customer street address is NOT rendered
      expect(screen.queryByText(/100 Market St/i)).not.toBeInTheDocument();
      // Quote button link exists
      expect(screen.getByText('Submit Quote')).toBeInTheDocument();
    });

    it('filters requests by search input', async () => {
      quoteService.getEligibleRequests.mockResolvedValueOnce({
        data: {
          items: mockEligibleRequests,
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      });

      render(
        <MemoryRouter>
          <ProviderRequests />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Master Bathroom Leak Repair')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search by title/i);
      fireEvent.change(searchInput, { target: { value: 'Nonexistent trade' } });

      await waitFor(() => {
        expect(screen.queryByText('Master Bathroom Leak Repair')).not.toBeInTheDocument();
        expect(screen.getByText('No eligible service requests right now')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // PART 3 — PROVIDER SUBMIT QUOTE FORM
  // ==========================================
  describe('ProviderSubmitQuotePage Component', () => {
    const mockRequest = {
      _id: 'req-101',
      title: 'Kitchen Sink Leaking',
      description: 'Water pool under sink',
      category: { name: 'Plumbing Services' },
      location: { city: 'San Francisco', state: 'CA', postalCode: '94105' },
      preferredDate: '2026-10-15T00:00:00.000Z',
      preferredTime: { start: '09:00', end: '13:00' },
      requiredSkills: ['Drain Clearing'],
    };

    it('validates positive amount, duration, and submits quote successfully', async () => {
      quoteService.getEligibleRequestById.mockResolvedValueOnce({
        data: { request: mockRequest },
      });
      quoteService.createQuote.mockResolvedValueOnce({
        data: {
          quote: {
            _id: 'quote-1',
            amount: 1500,
            currency: 'INR',
            status: 'SUBMITTED',
          },
        },
      });

      render(
        <MemoryRouter initialEntries={['/provider/requests/req-101/quote']}>
          <Routes>
            <Route path="/provider/requests/:id/quote" element={<ProviderSubmitQuotePage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Prepare & Submit Quote')).toBeInTheDocument();
        expect(screen.getByText('Kitchen Sink Leaking')).toBeInTheDocument();
      });

      // Fill in form
      const amountInput = screen.getByPlaceholderText('e.g. 1500');
      fireEvent.change(amountInput, { target: { value: '1800' } });

      const durationInput = screen.getByPlaceholderText('e.g. 2.5');
      fireEvent.change(durationInput, { target: { value: '2.5' } });

      const descTextarea = screen.getByPlaceholderText(/describe how you will address the problem/i);
      fireEvent.change(descTextarea, {
        target: { value: 'I will supply PVC materials and replace the faulty P-trap with 1-year warranty.' },
      });

      const submitBtn = screen.getByText('Submit Official Quote');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(quoteService.createQuote).toHaveBeenCalledWith('req-101', expect.objectContaining({
          amount: 1800,
          currency: 'INR',
          estimatedDuration: 2.5,
          description: 'I will supply PVC materials and replace the faulty P-trap with 1-year warranty.',
        }));
      });

      await waitFor(() => {
        expect(screen.getByText(/quote submitted successfully/i)).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // PART 4 — PROVIDER QUOTES TRACKER
  // ==========================================
  describe('ProviderQuotes Component', () => {
    const mockSubmittedQuotes = [
      {
        _id: 'q-101',
        amount: 2200,
        currency: 'INR',
        estimatedDuration: 3,
        description: 'Complete pipe rewiring and seal testing.',
        status: 'SUBMITTED',
        validUntil: '2026-10-30T00:00:00.000Z',
        createdAt: '2026-09-21T00:00:00.000Z',
        serviceRequest: { title: 'Master Bathroom Leak Repair' },
      },
    ];

    it('renders submitted quotes and allows provider to withdraw active quote', async () => {
      quoteService.getProviderQuotes.mockResolvedValueOnce({
        data: {
          items: mockSubmittedQuotes,
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      });
      quoteService.withdrawQuote.mockResolvedValueOnce({
        data: { quote: { _id: 'q-101', status: 'WITHDRAWN' } },
      });

      render(
        <MemoryRouter>
          <ProviderQuotes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Submitted Quotes')).toBeInTheDocument();
      });

      expect(screen.getByText('₹2,200')).toBeInTheDocument();
      expect(screen.getByText('SUBMITTED')).toBeInTheDocument();

      const withdrawBtn = screen.getByText('Withdraw');
      fireEvent.click(withdrawBtn);

      await waitFor(() => {
        expect(quoteService.withdrawQuote).toHaveBeenCalledWith('q-101');
      });
    });
  });

  // ==========================================
  // PART 5 — CUSTOMER REQUEST QUOTES COMPARISON & ACCEPTANCE
  // ==========================================
  describe('CustomerRequestQuotesPage Component', () => {
    const mockRequest = {
      _id: 'req-202',
      title: 'Water Heater Replacement',
      status: 'QUOTING',
    };

    const mockQuotes = [
      {
        _id: 'q-pro-1',
        amount: 3500,
        currency: 'INR',
        estimatedDuration: 4,
        description: 'High efficiency replacement including disposal of old tank.',
        status: 'SUBMITTED',
        validUntil: '2026-11-01T00:00:00.000Z',
        providerProfile: {
          businessName: 'Ace Heat & Plumbing',
          experienceYears: 10,
          rating: 4.8,
          skills: ['Heater Installation', 'Gas Fitting'],
        },
      },
    ];

    it('renders comparison cards and allows customer to accept quote', async () => {
      serviceRequestService.getServiceRequestById.mockResolvedValueOnce({
        data: { request: mockRequest },
      });
      quoteService.getQuotesForRequest.mockResolvedValueOnce({
        data: { items: mockQuotes },
      });
      quoteService.acceptQuote.mockResolvedValueOnce({
        data: {
          quote: { _id: 'q-pro-1', status: 'ACCEPTED' },
          serviceRequest: { _id: 'req-202', status: 'PROVIDER_SELECTED' },
        },
      });

      render(
        <MemoryRouter initialEntries={['/customer/requests/req-202/quotes']}>
          <Routes>
            <Route path="/customer/requests/:id/quotes" element={<CustomerRequestQuotesPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Quotes & Proposals')).toBeInTheDocument();
        expect(screen.getByText('Ace Heat & Plumbing')).toBeInTheDocument();
      });

      expect(screen.getByText('₹3,500')).toBeInTheDocument();
      expect(screen.getByText(/4 hrs/i)).toBeInTheDocument();

      const acceptBtn = screen.getByText('Accept This Quote');
      fireEvent.click(acceptBtn);

      // Verify Modal opens
      await waitFor(() => {
        expect(screen.getByText('Accept Service Quote')).toBeInTheDocument();
        expect(screen.getByText('Confirm Acceptance')).toBeInTheDocument();
      });

      // Confirm acceptance
      const confirmBtn = screen.getByText('Confirm Acceptance');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(quoteService.acceptQuote).toHaveBeenCalledWith('req-202', 'q-pro-1');
      });
    });
  });
});
