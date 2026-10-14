/**
 * Unit Tests for CareConnect Stitch Landing Page
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { LandingPage } from '../pages/LandingPage';
import categoryService from '../services/category.service';

vi.mock('../services/category.service', () => ({
  default: {
    getCategories: vi.fn(),
  },
}));

const mockCategories = [
  {
    _id: 'cat-clean-1',
    name: 'Home Sanctuary Cleaning',
    slug: 'cleaning',
    description: 'Deep residential cleaning and non-toxic sanitization.',
    icon: 'Sparkles',
    startingPrice: 499,
    pricingUnit: 'HOURLY',
    requiredSkills: ['Deep Cleaning', 'Sanitization'],
  },
  {
    _id: 'cat-plumb-2',
    name: 'Architectural Plumbing',
    slug: 'plumbing',
    description: 'Leak detection, pipe repairs, and brass fixture fitting.',
    icon: 'Droplets',
    startingPrice: 650,
    pricingUnit: 'STARTING_FROM',
    requiredSkills: ['Pipe Fitting', 'Leak Diagnostics'],
  },
];

describe('CareConnect Public Landing Page (Stitch Redesign)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoryService.getCategories.mockResolvedValue({
      data: { categories: mockCategories },
    });
  });

  const renderLandingPage = (authValue = {}) => {
    const defaultAuth = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      ...authValue,
    };

    return render(
      <MemoryRouter initialEntries={['/']}>
        <AuthContext.Provider value={defaultAuth}>
          <LandingPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  it('1. should render editorial headline, eyebrow pill, and hero copy', async () => {
    renderLandingPage();

    expect(
      screen.getByText(/A Better Home Starts With the Right Help\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Curated Home Sanctuary Stewardship/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Connect with verified home-service professionals/i)
    ).toBeInTheDocument();
  });

  it('2. should render unauthenticated navigation links and auth buttons', () => {
    renderLandingPage();

    expect(screen.getByRole('link', { name: /CareConnect Home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Login$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Sign Up$/i })).toBeInTheDocument();
  });

  it('3. should render dashboard link for authenticated customer', () => {
    const authState = {
      user: { id: 'cust-1', name: 'Aarav Sharma', role: 'CUSTOMER' },
      isAuthenticated: true,
    };
    renderLandingPage(authState);

    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Dashboard$/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Login$/i })).not.toBeInTheDocument();
  });

  it('4. should toggle mobile navigation menu when hamburger button is clicked', () => {
    renderLandingPage();

    const toggleButton = screen.getByLabelText(/toggle navigation menu/i);
    expect(toggleButton).toBeInTheDocument();

    // Initially mobile nav links inside the drawer should not be open
    fireEvent.click(toggleButton);

    // After click, mobile links should be visible
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('5. should fetch and display active categories with INR pricing format', async () => {
    renderLandingPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Home Sanctuary Cleaning' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Architectural Plumbing' })).toBeInTheDocument();
    });

    // Check INR pricing format
    expect(screen.getByText(/₹499 \/ hour/i)).toBeInTheDocument();
    expect(screen.getByText(/Starting at ₹650/i)).toBeInTheDocument();
  });

  it('6. should filter service categories when search scope is entered', async () => {
    renderLandingPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Home Sanctuary Cleaning' })).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/Requested Specialist or Scope/i);
    fireEvent.change(searchInput, { target: { value: 'Plumbing' } });

    expect(screen.getByRole('heading', { name: 'Architectural Plumbing' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home Sanctuary Cleaning' })).not.toBeInTheDocument();
  });

  it('7. should render photo-free hero cards: booking status, quote card, and micro-calendar', () => {
    renderLandingPage();

    // Card 1
    expect(screen.getByText(/Protocol No\. CC-8842/i)).toBeInTheDocument();
    expect(screen.getByText(/Residential Deep Care/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmed • Oct 24/i)).toBeInTheDocument();

    // Card 2
    expect(screen.getByText(/Top Match Quote/i)).toBeInTheDocument();
    expect(screen.getByText(/EcoCraft Maint\./i)).toBeInTheDocument();
    expect(screen.getByText(/₹1,499/i)).toBeInTheDocument();

    // Card 3
    expect(screen.getByText(/October 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/09:30 AM - 12:30 PM/i)).toBeInTheDocument();
  });

  it('8. should render the 4-step booking journey matching CareConnect workflow', () => {
    renderLandingPage();

    expect(screen.getByText(/Seamless Care in Four Steps/i)).toBeInTheDocument();
    expect(screen.getByText('Choose a Service')).toBeInTheDocument();
    expect(screen.getByText('Submit a Request')).toBeInTheDocument();
    expect(screen.getByText('Compare Verified Quotes')).toBeInTheDocument();
    expect(screen.getByText('Track Your Booking')).toBeInTheDocument();
  });

  it('9. should render Trust Architecture and final Forest Green CTA section', () => {
    renderLandingPage();

    expect(screen.getByText(/Engineered for Absolute Peace of Mind/i)).toBeInTheDocument();
    expect(screen.getByText('Rigorous Professional Vetting')).toBeInTheDocument();
    expect(screen.getByText('Transparent Upfront Estimates')).toBeInTheDocument();
    expect(screen.getByText('Seamless Digital Scheduling')).toBeInTheDocument();

    expect(screen.getByText(/Your next home project starts here\./i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Find Your Specialist/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore Provider Network/i })).toBeInTheDocument();
  });
});
