/**
 * CareConnect Public Landing Page
 * Stitch Design Re-creation: Sage & Forest Theme with Newsreader Editorial Typography,
 * Photo-Free Hero with Floating Product UI Cards, Dynamic Categories, and 4-Step Booking Journey.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wrench,
  Sparkles,
  Zap,
  Droplets,
  Hammer,
  Search,
  MapPin,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  Check,
  Star,
  RefreshCw,
  Menu,
  X,
  FileText,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_DASHBOARD_ROUTES, ROLE_LABELS } from '../constants/roles';
import categoryService from '../services/category.service';
import { formatPricingUnit } from '../utils/currency';
import Badge from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const iconMap = {
  Wrench,
  Sparkles,
  Zap,
  Droplets,
  Hammer,
};

// Fallback category catalog matching CareConnect database seeds if API is offline
const fallbackCategories = [
  {
    _id: 'cat-cleaning',
    name: 'Home Sanctuary Cleaning',
    slug: 'cleaning',
    description: 'Deep residential cleaning, move-out sanitization, kitchen and bathroom disinfection.',
    icon: 'Sparkles',
    startingPrice: 499,
    pricingUnit: 'HOURLY',
    requiredSkills: ['Deep Cleaning', 'Sanitization', 'Carpet Steaming'],
  },
  {
    _id: 'cat-plumbing',
    name: 'Architectural Plumbing',
    slug: 'plumbing',
    description: 'Leak detection, pipe repairs, drain cleaning, water heater servicing, and brass fixture fitting.',
    icon: 'Droplets',
    startingPrice: 650,
    pricingUnit: 'STARTING_FROM',
    requiredSkills: ['Pipe Fitting', 'Drain Snaking', 'Leak Diagnostics'],
  },
  {
    _id: 'cat-electrical',
    name: 'Electrical Systems',
    slug: 'electrical',
    description: 'Breaker panel load modernization, designer lighting installation, and safety wiring inspections.',
    icon: 'Zap',
    startingPrice: 750,
    pricingUnit: 'HOURLY',
    requiredSkills: ['Wiring Diagnostics', 'Circuit Protection', 'Fixture Installation'],
  },
  {
    _id: 'cat-appliance',
    name: 'Appliance & HVAC Diagnostics',
    slug: 'appliance-repair',
    description: 'Diagnosis and repair for washers, dryers, refrigeration, induction units, and microwaves.',
    icon: 'Wrench',
    startingPrice: 599,
    pricingUnit: 'STARTING_FROM',
    requiredSkills: ['Electrical Diagnostics', 'Motor Replacement', 'Appliance Calibration'],
  },
  {
    _id: 'cat-maintenance',
    name: 'Carpentry & Joinery',
    slug: 'home-maintenance',
    description: 'Precision millwork, cabinetry adjustment, drywall patching, weatherproofing, and fixture mounting.',
    icon: 'Hammer',
    startingPrice: 500,
    pricingUnit: 'HOURLY',
    requiredSkills: ['Drywall Patching', 'Woodworking', 'Hardware Assembly'],
  },
  {
    _id: 'cat-finishes',
    name: 'Fine Finishes & Surface Care',
    slug: 'fine-finishes',
    description: 'Architectural mineral coatings, natural stone sealing, grout restoration, and trim revitalization.',
    icon: 'Sparkles',
    startingPrice: 800,
    pricingUnit: 'STARTING_FROM',
    requiredSkills: ['Surface Sealing', 'Mineral Paint Application', 'Precision Trim'],
  },
];

export const LandingPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search Bar State
  const [searchScope, setSearchScope] = useState('');
  const [locationQuery, setLocationQuery] = useState('Bengaluru, KA');
  const [isEditingLocation, setIsEditingLocation] = useState(false);

  // Load real service categories from the CareConnect API
  useEffect(() => {
    const fetchCats = async () => {
      try {
        setIsLoadingCategories(true);
        const res = await categoryService.getCategories();
        const active = res.data?.categories || [];
        if (active.length > 0) {
          setCategories(active);
        } else {
          setCategories(fallbackCategories);
        }
      } catch {
        // Fallback to seeded catalog on connection issues
        setCategories(fallbackCategories);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCats();
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault?.();
    const servicesSection = document.getElementById('services');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCategoryClick = (category) => {
    if (isAuthenticated && user?.role === 'CUSTOMER') {
      navigate(`/customer/requests/new?categoryId=${category._id}`);
    } else if (isAuthenticated) {
      navigate(ROLE_DASHBOARD_ROUTES[user.role] || '/');
    } else {
      navigate(`/customer/requests/new?categoryId=${category._id}`);
    }
  };

  // Filtered categories based on search input
  const displayCategories = categories.filter((cat) => {
    if (!searchScope.trim()) return true;
    const query = searchScope.toLowerCase();
    return (
      cat.name.toLowerCase().includes(query) ||
      cat.description?.toLowerCase().includes(query) ||
      cat.slug?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-ivory text-darkgreen min-h-screen flex flex-col font-sans selection:bg-sage/40 selection:text-forest-deep antialiased">
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: RESPONSIVE NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-ivory/90 backdrop-blur-xl border-b border-themeborder shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-all">
        <div className="h-20 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-forest rounded-lg"
            aria-label="CareConnect Home"
          >
            <div className="w-8 h-8 rounded-lg bg-forest text-white flex items-center justify-center font-serif text-lg font-semibold select-none shadow-xs group-hover:bg-forest-deep transition-colors">
              C
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight text-darkgreen group-hover:text-forest transition-colors">
              CareConnect
            </span>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-7">
            <a
              href="#home"
              className="text-sm font-medium text-forest bg-palesage/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              Home
            </a>
            <a
              href="#services"
              className="text-sm font-medium text-darkgreen-muted hover:text-forest transition-colors py-1.5"
            >
              Services
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-darkgreen-muted hover:text-forest transition-colors py-1.5"
            >
              How It Works
            </a>
            <a
              href="#why-choose-us"
              className="text-sm font-medium text-darkgreen-muted hover:text-forest transition-colors py-1.5"
            >
              Why CareConnect
            </a>
            <Link
              to="/register?role=service_provider"
              className="text-sm font-medium text-darkgreen-muted hover:text-forest transition-colors py-1.5"
            >
              For Providers
            </Link>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-sm font-semibold text-darkgreen">
                  {user.name}
                </span>
                <Badge variant="primary" size="sm" className="hidden sm:inline-flex">
                  {ROLE_LABELS[user.role] || user.role}
                </Badge>
                <Link
                  to={ROLE_DASHBOARD_ROUTES[user.role] || '/'}
                  className="inline-flex items-center justify-center bg-forest text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-forest-deep transition-all shadow-xs"
                >
                  Dashboard
                </Link>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex text-sm font-semibold text-forest hover:text-forest-deep transition-colors px-3 py-2"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center bg-forest text-white text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-lg hover:bg-forest-deep transition-all active:scale-[0.99] shadow-xs"
                >
                  Sign Up
                </Link>
              </>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-darkgreen hover:bg-palesage/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest lg:hidden transition-colors"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-themeborder bg-ivory px-6 py-5 shadow-lg space-y-4 animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-2">
              <a
                href="#home"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-forest bg-palesage/60 px-3 py-2 rounded-lg"
              >
                Home
              </a>
              <a
                href="#services"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-darkgreen-muted hover:text-forest px-3 py-2 rounded-lg"
              >
                Services
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-darkgreen-muted hover:text-forest px-3 py-2 rounded-lg"
              >
                How It Works
              </a>
              <a
                href="#why-choose-us"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-darkgreen-muted hover:text-forest px-3 py-2 rounded-lg"
              >
                Why CareConnect
              </a>
              <Link
                to="/register?role=service_provider"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-darkgreen-muted hover:text-forest px-3 py-2 rounded-lg"
              >
                For Providers
              </Link>
            </nav>

            <div className="pt-3 border-t border-themeborder/60 flex flex-col gap-2.5">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 border border-themeborder rounded-lg text-darkgreen font-semibold hover:bg-palesage/40"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 bg-forest text-white rounded-lg font-semibold hover:bg-forest-deep shadow-xs"
                  >
                    Sign Up
                  </Link>
                </>
              ) : (
                <Link
                  to={ROLE_DASHBOARD_ROUTES[user?.role] || '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-forest text-white rounded-lg font-semibold hover:bg-forest-deep shadow-xs"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: HERO WITH FLOATING PRODUCT UI CARDS (PHOTO-FREE)
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 pt-20">
        <section id="home" className="relative w-full max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-20 overflow-hidden">
          {/* Ambient Botanical Vector Accents */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-sage/20 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-1/2 -right-24 w-[32rem] h-[32rem] bg-palesage/40 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column: Editorial Copy & Search Bar */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 bg-palesage text-forest px-3.5 py-1.5 rounded-full w-fit mb-6 shadow-xs border border-sage/30">
                <ShieldCheck className="w-4 h-4 text-forest shrink-0" />
                <span className="text-xs font-semibold tracking-wider uppercase">
                  Curated Home Sanctuary Stewardship
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[56px] text-darkgreen tracking-tight mb-5 leading-[1.08]">
                A Better Home Starts With the Right Help.
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-darkgreen-muted max-w-xl mb-9 leading-relaxed">
                Connect with verified home-service professionals across residential maintenance,
                repairs, and bespoke care. Upfront INR quotes and confirmed arrival windows.
              </p>

              {/* Search Bar Module */}
              <form
                onSubmit={handleSearchSubmit}
                className="bg-white rounded-xl p-3 lg:p-4 shadow-xl border border-themeborder mb-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Service Scope Input */}
                  <div className="md:col-span-6 flex flex-col justify-center px-3 py-1.5 bg-ivory rounded-lg focus-within:bg-white focus-within:ring-1 focus-within:ring-forest transition-colors">
                    <label
                      htmlFor="service-scope-input"
                      className="text-[11px] uppercase text-darkgreen-muted font-bold tracking-wider"
                    >
                      Requested Specialist or Scope
                    </label>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Search className="h-4 w-4 text-forest shrink-0" />
                      <input
                        id="service-scope-input"
                        type="text"
                        value={searchScope}
                        onChange={(e) => setSearchScope(e.target.value)}
                        placeholder="e.g. Deep cleaning, pipe leak, panel repair"
                        className="w-full bg-transparent border-0 p-0 text-darkgreen text-sm placeholder:text-darkgreen-muted/60 focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>

                  {/* Location Selector */}
                  <div className="md:col-span-4 flex flex-col justify-center px-3 py-1.5 bg-ivory rounded-lg focus-within:bg-white focus-within:ring-1 focus-within:ring-forest transition-colors">
                    <span className="text-[11px] uppercase text-darkgreen-muted font-bold tracking-wider">
                      Residence Location
                    </span>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-4 w-4 text-forest shrink-0" />
                        {isEditingLocation ? (
                          <input
                            type="text"
                            value={locationQuery}
                            onChange={(e) => setLocationQuery(e.target.value)}
                            onBlur={() => setIsEditingLocation(false)}
                            autoFocus
                            className="w-full bg-transparent border-0 p-0 text-darkgreen text-sm focus:outline-none focus:ring-0"
                          />
                        ) : (
                          <span className="text-sm font-medium text-darkgreen truncate">{locationQuery}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingLocation(!isEditingLocation)}
                        className="text-xs text-forest font-semibold hover:underline shrink-0"
                      >
                        {isEditingLocation ? 'Done' : 'Change'}
                      </button>
                    </div>
                  </div>

                  {/* Primary Search CTA */}
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="w-full h-12 inline-flex items-center justify-center gap-1.5 bg-forest text-white text-sm font-semibold rounded-lg hover:bg-forest-deep transition-all duration-200 active:scale-[0.98] shadow-xs px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                    >
                      <span>Search</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </form>

              {/* Trust Signals */}
              <div className="flex flex-wrap items-center gap-6 text-darkgreen-muted text-xs font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-palesage flex items-center justify-center text-forest">
                    <Check className="h-3 w-3 stroke-[2.5]" />
                  </div>
                  <span>Transparent Invoicing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-palesage flex items-center justify-center text-forest">
                    <Clock className="h-3 w-3" />
                  </div>
                  <span>Prompt Intake Response</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-palesage flex items-center justify-center text-forest">
                    <Shield className="h-3 w-3" />
                  </div>
                  <span>Verified Specialists</span>
                </div>
              </div>
            </div>

            {/* Right Column: Layered Product UI Composition (Pure vector & card interface, strictly zero human stock photos) */}
            <div className="lg:col-span-5 relative w-full flex items-center justify-center min-h-[460px]">
              {/* Background Radial Decorative Grid Accent */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                <svg className="w-full h-full text-forest/20" fill="none" viewBox="0 0 400 400">
                  <circle cx="200" cy="200" r="190" stroke="currentColor" strokeDasharray="3 3" />
                  <circle cx="200" cy="200" r="130" stroke="currentColor" strokeDasharray="2 2" />
                  <circle cx="200" cy="200" r="70" stroke="currentColor" />
                  <line x1="200" y1="0" x2="200" y2="400" stroke="currentColor" strokeDasharray="4 4" strokeWidth="0.5" />
                  <line x1="0" y1="200" x2="400" y2="200" stroke="currentColor" strokeDasharray="4 4" strokeWidth="0.5" />
                </svg>
              </div>

              {/* Layer 1 (Card 1): Primary Booking Status Card */}
              <div className="w-full max-w-md bg-white rounded-xl p-5 shadow-2xl border border-themeborder relative z-20">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-palesage text-forest px-1.5 py-0.5 rounded">
                        Live Preview
                      </span>
                      <span className="text-[11px] uppercase tracking-wider text-darkgreen-muted font-semibold">
                        Protocol No. CC-8842
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-darkgreen mt-0.5">
                      Residential Deep Care
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-palesage text-forest text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" />
                    Confirmed • Oct 24
                  </span>
                </div>

                {/* Protocol Progress Bar */}
                <div className="w-full bg-palesage rounded-full h-1.5 mb-4 overflow-hidden">
                  <div className="bg-forest h-1.5 rounded-full w-[68%] transition-all duration-500" />
                </div>

                {/* Checklist Milestones */}
                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-ivory text-darkgreen text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-forest text-white flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                      <span className="font-medium">Sanitization &amp; Scope Assessment</span>
                    </div>
                    <span className="text-forest font-semibold">Complete</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-ivory text-darkgreen text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full border border-forest text-forest flex items-center justify-center shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-forest animate-ping" />
                      </div>
                      <span className="font-semibold">Specialist Dispatched &amp; In Transit</span>
                    </div>
                    <span className="text-forest font-semibold">In Progress</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-ivory/60 text-darkgreen-muted text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full border border-themeborder flex items-center justify-center shrink-0" />
                      <span>Quality Inspection &amp; Mutual Sign-off</span>
                    </div>
                    <span className="text-darkgreen-muted">Queued</span>
                  </div>
                </div>

                {/* Assigned Provider Meta */}
                <div className="pt-3 border-t border-themeborder flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-forest text-white flex items-center justify-center font-serif text-sm font-semibold">
                      AL
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-darkgreen leading-tight">Atelier Living Crew #4</div>
                      <div className="text-[11px] text-darkgreen-muted">Tier 1 Verified Provider</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-forest">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-darkgreen">4.98</span>
                  </div>
                </div>
              </div>

              {/* Layer 2 (Card 2): 3 Transparent Quotes Floating Subcard */}
              <div className="absolute -bottom-8 -left-6 w-72 bg-white rounded-xl p-4 shadow-xl border border-themeborder z-30 transition-transform duration-300 hover:-translate-y-1 hidden sm:block">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-darkgreen-muted tracking-wider">
                      Top Match Quote
                    </span>
                    <span className="text-[9px] uppercase font-semibold text-darkgreen-muted/80 bg-ivory border border-themeborder/60 px-1 rounded">
                      Sample
                    </span>
                  </div>
                  <span className="bg-palesage text-forest text-[11px] px-2 py-0.5 rounded-full font-semibold">
                    4m Response
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-darkgreen">EcoCraft Maint.</div>
                    <div className="text-xs text-darkgreen-muted flex items-center gap-1 mt-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>4.9 (142 audits)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-forest">₹1,499</div>
                    <div className="text-[10px] text-darkgreen-muted">Fixed Rate</div>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-themeborder flex items-center justify-between text-xs">
                  <span className="text-darkgreen-muted">Available Tomorrow</span>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center gap-0.5 text-forest font-semibold hover:underline"
                  >
                    <span>Compare (3)</span>
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Layer 3 (Card 3): Scheduling Micro-Calendar Floating Top Right */}
              <div className="absolute -top-7 -right-4 w-64 bg-white rounded-xl p-3.5 shadow-lg border border-themeborder z-10 transition-transform duration-300 hover:translate-y-1 hidden sm:block">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-darkgreen">October 2026</span>
                  <Calendar className="h-4 w-4 text-darkgreen-muted" />
                </div>
                {/* Weekly Date Strip */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2.5 text-[11px]">
                  <span className="text-darkgreen-muted">M</span>
                  <span className="text-darkgreen-muted">T</span>
                  <span className="text-darkgreen-muted">W</span>
                  <span className="text-darkgreen-muted">T</span>
                  <span className="text-forest font-bold">F</span>
                  <span className="text-darkgreen-muted">S</span>
                  <span className="text-darkgreen-muted">S</span>
                  <span className="py-0.5 text-darkgreen-muted">20</span>
                  <span className="py-0.5 text-darkgreen-muted">21</span>
                  <span className="py-0.5 text-darkgreen-muted">22</span>
                  <span className="py-0.5 text-darkgreen-muted">23</span>
                  <span className="py-0.5 bg-forest text-white font-bold rounded-md">24</span>
                  <span className="py-0.5 text-darkgreen-muted">25</span>
                  <span className="py-0.5 text-darkgreen-muted">26</span>
                </div>
                <div className="bg-ivory rounded-lg p-2 text-darkgreen flex items-center justify-between">
                  <div className="truncate pr-1">
                    <span className="text-[11px] text-forest font-bold block">09:30 AM - 12:30 PM</span>
                    <span className="text-[10px] text-darkgreen-muted truncate block">Slot Confirmed</span>
                  </div>
                  <div className="shrink-0 p-1 rounded bg-white text-forest shadow-2xs">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 3: CURATED HOME SERVICES
        ───────────────────────────────────────────────────────────── */}
        <section id="services" className="w-full bg-palesage/30 py-16 lg:py-24 border-t border-themeborder">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
              <div>
                <span className="text-xs font-semibold text-forest tracking-wider uppercase block mb-2">
                  Bespoke Categories
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-[40px] text-darkgreen tracking-tight">
                  Curated Home Services
                </h2>
              </div>
              <p className="text-sm sm:text-base text-darkgreen-muted max-w-md mt-4 md:mt-0 leading-relaxed">
                Tailored specialists for every corner of your residence. Vetted for technical skill,
                transparent pricing, and precision execution.
              </p>
            </div>

            {/* Categories Loading State */}
            {isLoadingCategories && (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" label="Loading available services..." />
              </div>
            )}

            {/* 6 Clean Desktop Service Cards (Minimal vector iconography, zero photos) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayCategories.map((cat) => {
                const IconComponent = iconMap[cat.icon] || Wrench;
                return (
                  <div
                    key={cat._id || cat.slug}
                    onClick={() => handleCategoryClick(cat)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCategoryClick(cat);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="group bg-white rounded-xl p-6 shadow-xs border border-themeborder hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                  >
                    <div>
                      {/* Minimal Service Icon */}
                      <div className="w-12 h-12 rounded-xl bg-palesage text-forest flex items-center justify-center mb-5 group-hover:bg-forest group-hover:text-white transition-colors duration-200 shadow-2xs">
                        <IconComponent className="h-6 w-6 stroke-[1.75]" />
                      </div>

                      <h3 className="font-serif text-xl font-bold text-darkgreen mb-2 group-hover:text-forest transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-sm text-darkgreen-muted leading-relaxed mb-6 line-clamp-3">
                        {cat.description}
                      </p>

                      {/* Required Skills Badges */}
                      {cat.requiredSkills && cat.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-6">
                          {cat.requiredSkills.slice(0, 3).map((skill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-ivory text-darkgreen-muted border border-themeborder/60"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-themeborder flex items-center justify-between">
                      <span className="text-sm font-bold text-darkgreen">
                        {formatPricingUnit(cat.pricingUnit, cat.startingPrice)}
                      </span>
                      <span className="w-8 h-8 rounded-lg bg-ivory text-forest flex items-center justify-center group-hover:bg-forest group-hover:text-white group-hover:translate-x-1 transition-all duration-200">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 4: HOW IT WORKS (4-STEP HORIZONTAL FLOW)
        ───────────────────────────────────────────────────────────── */}
        <section id="how-it-works" className="w-full bg-ivory py-16 lg:py-24 border-t border-themeborder">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-semibold text-forest tracking-wider uppercase block mb-2">
                The CareConnect Standard
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[40px] text-darkgreen tracking-tight mb-4">
                Seamless Care in Four Steps
              </h2>
              <p className="text-base sm:text-lg text-darkgreen-muted leading-relaxed">
                Designed to remove ambiguity and telephone tag. Pure clarity from service selection to
                signed inspection.
              </p>
            </div>

            {/* 4-Step Flow Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connecting Line for Desktop */}
              <div className="hidden lg:block absolute top-7 left-12 right-12 h-[2px] bg-themeborder -z-0" />

              {/* Step 1 */}
              <div className="flex flex-col relative z-10">
                <div className="w-14 h-14 rounded-full bg-forest text-white flex items-center justify-center font-serif text-xl font-semibold mb-6 shadow-md border-4 border-ivory">
                  1
                </div>
                <h3 className="font-serif text-xl font-bold text-darkgreen mb-2.5">
                  Choose a Service
                </h3>
                <p className="text-sm text-darkgreen-muted leading-relaxed">
                  Select your specific home need with customizable project scope parameters, materials
                  grade, and service requirements.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col relative z-10">
                <div className="w-14 h-14 rounded-full bg-forest text-white flex items-center justify-center font-serif text-xl font-semibold mb-6 shadow-md border-4 border-ivory">
                  2
                </div>
                <h3 className="font-serif text-xl font-bold text-darkgreen mb-2.5">
                  Submit a Request
                </h3>
                <p className="text-sm text-darkgreen-muted leading-relaxed">
                  Specify access requirements, timing preferences, and upload project structural notes
                  in minutes.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col relative z-10">
                <div className="w-14 h-14 rounded-full bg-forest text-white flex items-center justify-center font-serif text-xl font-semibold mb-6 shadow-md border-4 border-ivory">
                  3
                </div>
                <h3 className="font-serif text-xl font-bold text-darkgreen mb-2.5">
                  Compare Verified Quotes
                </h3>
                <p className="text-sm text-darkgreen-muted leading-relaxed">
                  Receive transparent itemized quotes with clear upfront INR pricing, verified
                  provider credentials, and schedule options.
                </p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col relative z-10">
                <div className="w-14 h-14 rounded-full bg-forest text-white flex items-center justify-center font-serif text-xl font-semibold mb-6 shadow-md border-4 border-ivory">
                  4
                </div>
                <h3 className="font-serif text-xl font-bold text-darkgreen mb-2.5">
                  Track Your Booking
                </h3>
                <p className="text-sm text-darkgreen-muted leading-relaxed">
                  Monitor specialist arrival window, real-time photographic milestones, and confirm
                  completion directly in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 5: TRUST ARCHITECTURE / WHY CARECONNECT
        ───────────────────────────────────────────────────────────── */}
        <section id="why-choose-us" className="w-full bg-palesage/30 py-16 lg:py-24 border-t border-themeborder">
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-semibold text-forest tracking-wider uppercase block mb-2">
                Trust Architecture
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[40px] text-darkgreen tracking-tight mb-4">
                Engineered for Absolute Peace of Mind
              </h2>
              <p className="text-base sm:text-lg text-darkgreen-muted leading-relaxed">
                Our verification safeguards protect your home investment at every juncture.
              </p>
            </div>

            {/* 3-Column Benefit Cards with Architectural Precision */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Benefit 1 */}
              <div className="bg-white rounded-xl p-8 shadow-xs border border-themeborder flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-palesage text-forest flex items-center justify-center mb-6">
                    <ShieldCheck className="h-6 w-6 stroke-[1.75]" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-darkgreen mb-3">
                    Rigorous Professional Vetting
                  </h3>
                  <p className="text-sm text-darkgreen-muted leading-relaxed mb-6">
                    Every provider undergoes identity screening, trade skill verification, and
                    platform onboarding review before accepting service requests.
                  </p>
                </div>
                <Link
                  to="/register?role=service_provider"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline"
                >
                  <span>Explore Provider Standards</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Benefit 2 */}
              <div className="bg-white rounded-xl p-8 shadow-xs border border-themeborder flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-palesage text-forest flex items-center justify-center mb-6">
                    <FileText className="h-6 w-6 stroke-[1.75]" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-darkgreen mb-3">
                    Transparent Upfront Estimates
                  </h3>
                  <p className="text-sm text-darkgreen-muted leading-relaxed mb-6">
                    Zero hidden arrival fees or surprise material markups. Clear scope agreements and
                    itemized INR quotes are approved digitally before work commences.
                  </p>
                </div>
                <a
                  href="#services"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline"
                >
                  <span>Read Pricing Transparency Policy</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* Benefit 3 */}
              <div className="bg-white rounded-xl p-8 shadow-xs border border-themeborder flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-palesage text-forest flex items-center justify-center mb-6">
                    <Calendar className="h-6 w-6 stroke-[1.75]" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-darkgreen mb-3">
                    Seamless Digital Scheduling
                  </h3>
                  <p className="text-sm text-darkgreen-muted leading-relaxed mb-6">
                    Live calendar windows, centralized communication, clear booking updates, and
                    direct access to customer assistance.
                  </p>
                </div>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline"
                >
                  <span>View Platform Capabilities</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 6: FINAL CALL TO ACTION (FOREST GREEN)
        ───────────────────────────────────────────────────────────── */}
        <section id="for-providers" className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <div className="relative bg-forest rounded-2xl p-8 sm:p-12 lg:p-16 text-white overflow-hidden shadow-2xl">
            {/* Minimal Architectural Line Accents inside Card */}
            <div className="absolute -right-16 -top-16 w-80 h-80 opacity-10 pointer-events-none">
              <svg className="w-full h-full text-white" fill="none" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" />
                <circle cx="100" cy="100" r="60" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" />
                <path d="M10 100h180M100 10v180" stroke="currentColor" strokeWidth="0.5" />
              </svg>
            </div>

            <div className="max-w-2xl relative z-10">
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[40px] text-white mb-4 tracking-tight leading-tight">
                Your next home project starts here.
              </h2>
              <p className="text-base sm:text-lg text-sage-pale/90 mb-8 leading-relaxed">
                Join thousands of homeowners enjoying effortless, verified property care and sanctuary stewardship.
              </p>

              {/* CTA Button Group */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
                <Link
                  to={isAuthenticated ? '/customer/requests/new' : '/register'}
                  className="inline-flex items-center justify-center bg-palesage text-forest text-sm font-semibold px-6 py-3.5 rounded-lg hover:bg-white transition-colors active:scale-[0.99] shadow-sm text-center"
                >
                  Find Your Specialist
                </Link>
                <Link
                  to="/register?role=service_provider"
                  className="inline-flex items-center justify-center bg-transparent text-white border border-palesage/40 text-sm font-semibold px-6 py-3.5 rounded-lg hover:bg-forest-deep transition-colors active:scale-[0.99] text-center"
                >
                  Explore Provider Network
                </Link>
              </div>

              {/* Reassurance Indicators */}
              <div className="flex flex-wrap items-center gap-6 text-xs text-sage-pale/80 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage" />
                  <span>No upfront reservation cost</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sage" />
                  <span>Prompt Quote Responses</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sage" />
                  <span>Accredited Professionals Only</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 7: CLEAN FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="w-full bg-ivory border-t border-themeborder mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand Column */}
            <div className="lg:col-span-2 pr-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-forest text-white flex items-center justify-center font-serif text-sm font-semibold select-none">
                    C
                  </div>
                  <span className="font-serif text-xl font-bold text-darkgreen tracking-tight">
                    CareConnect
                  </span>
                </div>
                <p className="text-sm text-darkgreen-muted max-w-sm leading-relaxed">
                  A modern marketplace for residential, home operations, and sanctuary-grade services.
                  Curated with quiet precision for dependable households.
                </p>
              </div>
              <div className="mt-6 text-darkgreen-muted text-xs tracking-wider uppercase flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-forest inline-block" />
                Verified Stewardship Standard
              </div>
            </div>

            {/* Services Links */}
            <div>
              <h4 className="text-sm font-bold text-darkgreen mb-4">Services</h4>
              <ul className="space-y-2.5 text-sm text-darkgreen-muted">
                {categories.slice(0, 5).map((cat) => (
                  <li key={cat._id || cat.slug}>
                    <button
                      type="button"
                      onClick={() => handleCategoryClick(cat)}
                      className="hover:text-forest transition-colors text-left"
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Explore Links */}
            <div>
              <h4 className="text-sm font-bold text-darkgreen mb-4">Explore</h4>
              <ul className="space-y-2.5 text-sm text-darkgreen-muted">
                <li>
                  <a href="#how-it-works" className="hover:text-forest transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#why-choose-us" className="hover:text-forest transition-colors">
                    Trust Architecture
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-forest transition-colors">
                    All Services
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-forest transition-colors">
                    Customer Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* For Providers Links */}
            <div>
              <h4 className="text-sm font-bold text-darkgreen mb-4">For Providers</h4>
              <ul className="space-y-2.5 text-sm text-darkgreen-muted">
                <li>
                  <Link to="/register?role=service_provider" className="hover:text-forest transition-colors">
                    Apply for Accreditation
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-forest transition-colors">
                    Provider Dashboard
                  </Link>
                </li>
                <li>
                  <a href="#why-choose-us" className="hover:text-forest transition-colors">
                    Operational Standards
                  </a>
                </li>
                <li>
                  <a href="#for-providers" className="hover:text-forest transition-colors">
                    Partner Network
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Sub-Footer */}
          <div className="border-t border-themeborder pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-darkgreen-muted">
            <p>© 2026 CareConnect. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#home" className="hover:text-forest transition-colors">
                Back to Top
              </a>
              <a href="#services" className="hover:text-forest transition-colors">
                Categories
              </a>
              <Link to="/login" className="hover:text-forest transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
