/**
 * Frontend Unit & Component Integration Tests: Milestone 6
 * Covers:
 * 1. Customer quote acceptance with schedule slot selection (date/time) & conflict handling
 * 2. Customer bookings list & status filtering
 * 3. Customer booking detail view & cancellation with reason
 * 4. Provider scheduled jobs list & agenda view
 * 5. Provider booking detail view with revealed customer address
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import quoteService from '../services/quote.service';
import serviceRequestService from '../services/serviceRequest.service';
import bookingService from '../services/booking.service';

import { CustomerRequestQuotesPage } from '../pages/customer/CustomerRequestQuotesPage';
import { CustomerBookings } from '../pages/customer/CustomerBookings';
import { CustomerBookingDetailPage } from '../pages/customer/CustomerBookingDetailPage';
import { ProviderBookings } from '../pages/provider/ProviderBookings';
import { ProviderBookingDetailPage } from '../pages/provider/ProviderBookingDetailPage';

// Mock Services
vi.mock('../services/quote.service', () => ({
  default: {
    getQuotesForRequest: vi.fn(),
    acceptQuote: vi.fn(),
  },
}));

vi.mock('../services/serviceRequest.service', () => ({
  default: {
    getServiceRequestById: vi.fn(),
  },
}));

vi.mock('../services/booking.service', () => ({
  default: {
    acceptQuoteAndBook: vi.fn(),
    getCustomerBookings: vi.fn(),
    getCustomerBookingById: vi.fn(),
    cancelCustomerBooking: vi.fn(),
    getProviderBookings: vi.fn(),
    getProviderBookingById: vi.fn(),
    cancelProviderBooking: vi.fn(),
  },
}));

describe('Milestone 6: Booking & Scheduling Engine Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================
  // 1. Customer Quote Acceptance with Scheduling Modal
  // ========================================================
  describe('Customer Quote Acceptance with Schedule Selection', () => {
    const mockRequest = {
      _id: 'req123',
      title: 'Fix Kitchen Sink',
      status: 'QUOTING',
      preferredDate: '2026-10-15T00:00:00.000Z',
    };

    const mockQuote = {
      _id: 'quote123',
      amount: 450,
      currency: 'INR',
      estimatedDuration: 2,
      description: 'Full unclog and pipe fix',
      status: 'SUBMITTED',
      provider: { name: 'Mario Rossi', email: 'mario@plumber.local' },
      providerProfile: {
        businessName: 'Mario Master Plumbing',
        verificationStatus: 'APPROVED',
      },
    };

    it('opens schedule modal and submits booking with scheduledStart and scheduledEnd', async () => {
      serviceRequestService.getServiceRequestById.mockResolvedValueOnce({
        data: { request: mockRequest },
      });
      quoteService.getQuotesForRequest.mockResolvedValueOnce({
        data: { items: [mockQuote] },
      });
      bookingService.acceptQuoteAndBook.mockResolvedValueOnce({
        data: {
          booking: { _id: 'book999', status: 'CONFIRMED' },
          quote: { ...mockQuote, status: 'ACCEPTED' },
        },
      });

      render(
        <MemoryRouter initialEntries={['/customer/requests/req123/quotes']}>
          <Routes>
            <Route
              path="/customer/requests/:id/quotes"
              element={<CustomerRequestQuotesPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Fix Kitchen Sink')).toBeInTheDocument();
        expect(screen.getByText('Mario Master Plumbing')).toBeInTheDocument();
      });

      // Click Accept Quote button to open modal
      const acceptBtn = screen.getByRole('button', { name: /accept this quote/i });
      fireEvent.click(acceptBtn);

      // Verify modal opened with scheduling inputs
      expect(screen.getByText('Accept Service Quote')).toBeInTheDocument();
      expect(screen.getByText(/appointment schedule/i)).toBeInTheDocument();

      // Submit booking
      const confirmBtn = screen.getByRole('button', { name: /confirm acceptance/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(bookingService.acceptQuoteAndBook).toHaveBeenCalledTimes(1);
        expect(bookingService.acceptQuoteAndBook).toHaveBeenCalledWith(
          'req123',
          'quote123',
          expect.objectContaining({
            scheduledStart: expect.any(String),
            scheduledEnd: expect.any(String),
          })
        );
      });
    });

    it('displays conflict error message when double-booking conflict occurs (409)', async () => {
      serviceRequestService.getServiceRequestById.mockResolvedValueOnce({
        data: { request: mockRequest },
      });
      quoteService.getQuotesForRequest.mockResolvedValueOnce({
        data: { items: [mockQuote] },
      });
      bookingService.acceptQuoteAndBook.mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            message: 'Booking conflict detected: The provider already has an active booking during this time slot',
          },
        },
      });

      render(
        <MemoryRouter initialEntries={['/customer/requests/req123/quotes']}>
          <Routes>
            <Route
              path="/customer/requests/:id/quotes"
              element={<CustomerRequestQuotesPage />}
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Mario Master Plumbing')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /accept this quote/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm acceptance/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/booking conflict detected/i)
        ).toBeInTheDocument();
      });
    });
  });

  // ========================================================
  // 2. Customer Bookings List & Cancellation
  // ========================================================
  describe('Customer Bookings List Page', () => {
    const mockBookings = [
      {
        _id: 'book1',
        scheduledStart: '2026-10-20T10:00:00.000Z',
        scheduledEnd: '2026-10-20T12:00:00.000Z',
        price: 350,
        currency: 'INR',
        status: 'CONFIRMED',
        serviceRequest: {
          title: 'Pipe Leak Repair',
          location: { city: 'San Francisco' },
        },
        provider: { name: 'Mario Rossi', email: 'mario@plumber.local' },
        providerProfile: { businessName: 'Mario Master Plumbing' },
      },
    ];

    it('renders customer bookings list and filters by status', async () => {
      bookingService.getCustomerBookings.mockResolvedValueOnce({
        data: { items: mockBookings, pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
      });

      render(
        <MemoryRouter initialEntries={['/customer/bookings']}>
          <Routes>
            <Route path="/customer/bookings" element={<CustomerBookings />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('My Bookings')).toBeInTheDocument();
        expect(screen.getByText('Pipe Leak Repair')).toBeInTheDocument();
        expect(screen.getByText('Mario Master Plumbing')).toBeInTheDocument();
        expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
        expect(screen.getByText(/₹350 INR/)).toBeInTheDocument();
      });

      // Status filter tab
      bookingService.getCustomerBookings.mockResolvedValueOnce({
        data: { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } },
      });
      const completedTab = screen.getByRole('button', { name: 'Completed' });
      fireEvent.click(completedTab);

      await waitFor(() => {
        expect(bookingService.getCustomerBookings).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'COMPLETED' })
        );
      });
    });

    it('cancels customer booking with mandatory reason', async () => {
      bookingService.getCustomerBookings.mockResolvedValue({
        data: { items: mockBookings, pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
      });
      bookingService.cancelCustomerBooking.mockResolvedValueOnce({
        data: { success: true },
      });

      render(
        <MemoryRouter initialEntries={['/customer/bookings']}>
          <Routes>
            <Route path="/customer/bookings" element={<CustomerBookings />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Pipe Leak Repair')).toBeInTheDocument();
      });

      // Click Cancel button
      const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
      fireEvent.click(cancelBtn);

      expect(screen.getByText('Cancel Booking')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/minimum 5 characters/i)).toBeInTheDocument();

      // Enter reason and confirm
      fireEvent.change(screen.getByPlaceholderText(/minimum 5 characters/i), {
        target: { value: 'Plans changed, rescheduling later.' },
      });

      const confirmCancelBtn = screen.getByRole('button', { name: /confirm cancellation/i });
      fireEvent.click(confirmCancelBtn);

      await waitFor(() => {
        expect(bookingService.cancelCustomerBooking).toHaveBeenCalledWith('book1', {
          reason: 'Plans changed, rescheduling later.',
        });
      });
    });
  });

  // ========================================================
  // 3. Customer Booking Detail Page
  // ========================================================
  describe('Customer Booking Detail Page', () => {
    const mockDetail = {
      _id: 'book1',
      scheduledStart: '2026-10-20T10:00:00.000Z',
      scheduledEnd: '2026-10-20T12:00:00.000Z',
      price: 500,
      currency: 'INR',
      status: 'CONFIRMED',
      serviceRequest: {
        title: 'Emergency Clog Fix',
        description: 'Water overflowing in second floor bathroom.',
        location: { address: '123 Market St', city: 'San Francisco', postalCode: '94103' },
        category: { name: 'Plumbing' },
      },
      provider: { name: 'Mario Rossi', email: 'mario@plumber.local', phone: '+1-555-0100' },
      providerProfile: {
        businessName: 'Mario Master Plumbing',
        skills: ['Drain Cleaning', 'Pipe Repair'],
      },
    };

    it('renders complete booking details, provider info, and price in INR', async () => {
      bookingService.getCustomerBookingById.mockResolvedValueOnce({
        data: { booking: mockDetail },
      });

      render(
        <MemoryRouter initialEntries={['/customer/bookings/book1']}>
          <Routes>
            <Route path="/customer/bookings/:id" element={<CustomerBookingDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Clog Fix')).toBeInTheDocument();
        expect(screen.getByText('Mario Master Plumbing')).toBeInTheDocument();
        expect(screen.getByText(/₹500 INR/)).toBeInTheDocument();
        expect(screen.getByText('Drain Cleaning')).toBeInTheDocument();
      });
    });
  });

  // ========================================================
  // 4. Provider Bookings & Agenda View
  // ========================================================
  describe('Provider Bookings Page', () => {
    const mockProviderBookings = [
      {
        _id: 'bookP1',
        scheduledStart: '2026-10-25T14:00:00.000Z',
        scheduledEnd: '2026-10-25T16:00:00.000Z',
        price: 600,
        currency: 'INR',
        status: 'CONFIRMED',
        customer: { name: 'Alice Customer' },
        serviceRequest: {
          title: 'Heater Maintenance',
          location: { address: '500 Howard St', city: 'San Francisco' },
        },
      },
    ];

    it('renders provider jobs and toggles to agenda view', async () => {
      bookingService.getProviderBookings.mockResolvedValueOnce({
        data: { items: mockProviderBookings, pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
      });

      render(
        <MemoryRouter initialEntries={['/provider/bookings']}>
          <Routes>
            <Route path="/provider/bookings" element={<ProviderBookings />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Scheduled Service Jobs')).toBeInTheDocument();
        expect(screen.getByText('Heater Maintenance')).toBeInTheDocument();
        expect(screen.getByText(/Alice Customer/)).toBeInTheDocument();
      });

      // Switch to Agenda View
      const agendaBtn = screen.getByRole('button', { name: /agenda/i });
      fireEvent.click(agendaBtn);

      expect(screen.getByText(/1 appointment/i)).toBeInTheDocument();
    });
  });

  // ========================================================
  // 5. Provider Booking Detail Page with Revealed Address
  // ========================================================
  describe('Provider Booking Detail Page', () => {
    const mockJob = {
      _id: 'bookP1',
      scheduledStart: '2026-10-25T14:00:00.000Z',
      scheduledEnd: '2026-10-25T16:00:00.000Z',
      price: 600,
      currency: 'INR',
      status: 'CONFIRMED',
      customer: { name: 'Alice Customer', email: 'alice@customer.local', phone: '+1-555-0999' },
      serviceRequest: {
        title: 'Heater Maintenance',
        description: 'Complete inspection and coil flush.',
        location: { address: '500 Howard St, Apt 4B', city: 'San Francisco', postalCode: '94105' },
        category: { name: 'HVAC' },
      },
    };

    it('reveals customer address and contact info for service execution', async () => {
      bookingService.getProviderBookingById.mockResolvedValueOnce({
        data: { booking: mockJob },
      });

      render(
        <MemoryRouter initialEntries={['/provider/bookings/bookP1']}>
          <Routes>
            <Route path="/provider/bookings/:id" element={<ProviderBookingDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Heater Maintenance')).toBeInTheDocument();
        expect(screen.getByText('Address Unlocked')).toBeInTheDocument();
        expect(screen.getByText('500 Howard St, Apt 4B')).toBeInTheDocument();
        expect(screen.getByText('Alice Customer')).toBeInTheDocument();
        expect(screen.getByText('+1-555-0999')).toBeInTheDocument();
      });
    });
  });
});
