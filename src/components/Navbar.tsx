import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { BrandMark } from './BrandMark';
import { ClerkAuthControls } from './ClerkAuthControls';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Our Menu', to: '/menu' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems } = useCart();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 36);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isOverDarkHero = !scrolled && !mobileOpen;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-200 ${
        isOverDarkHero
          ? 'bg-gradient-to-b from-[#3A0613]/85 via-[#5A0B1E]/55 to-transparent text-[#FAF7F2]'
          : 'bg-[#FAF7F2]/95 backdrop-blur-md text-[#1C1917] border-b border-[#5A0B1E]/10 shadow-xs'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4 lg:gap-8">
        {/* Brand Wordmark */}
        <Link to="/" className="shrink-0" aria-label="Yomat Kitchen home">
          <BrandMark variant={isOverDarkHero ? 'light' : 'dark'} size="md" />
        </Link>

        {/* Primary Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-6 lg:gap-8"
        >
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `relative py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isOverDarkHero
                    ? isActive
                      ? 'text-white'
                      : 'text-[#FAF7F2]/85 hover:text-white'
                    : isActive
                    ? 'text-[#5A0B1E]'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span>{link.label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 right-0 -bottom-0.5 h-[2px] transition-transform duration-200 origin-left ${
                      isOverDarkHero ? 'bg-[#FCA5A5]' : 'bg-[#B91C1C]'
                    } ${isActive ? 'scale-x-100' : 'scale-x-0'}`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Right Controls: Cart + Clerk-ready Auth Controls */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <Link
            to="/cart"
            aria-label={`Order cart with ${totalItems} item${totalItems === 1 ? '' : 's'}`}
            className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              isOverDarkHero
                ? 'text-[#FAF7F2] hover:bg-white/10'
                : 'text-[#1C1917] hover:bg-[#5A0B1E]/6'
            }`}
          >
            <ShoppingBag className="w-5 h-5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Order</span>
            <span
              className={`tabular-nums text-xs font-semibold px-1.5 py-0.5 rounded-md min-w-[22px] text-center ${
                totalItems > 0
                  ? 'bg-[#15803D] text-white'
                  : isOverDarkHero
                  ? 'bg-white/20 text-white'
                  : 'bg-[#1C1917]/8 text-[#57534E]'
              }`}
            >
              {totalItems}
            </span>
          </Link>

          <div className="hidden md:block">
            <ClerkAuthControls isOverDarkHero={isOverDarkHero} variant="desktop" />
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className={`md:hidden p-2 rounded-lg transition-colors cursor-pointer ${
              isOverDarkHero
                ? 'text-[#FAF7F2] hover:bg-white/10'
                : 'text-[#1C1917] hover:bg-[#1C1917]/6'
            }`}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out bg-[#FAF7F2] text-[#1C1917] border-b border-[#5A0B1E]/12 ${
          mobileOpen ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="px-4 pt-2 pb-5 space-y-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-[#5A0B1E]/8 text-[#5A0B1E]'
                    : 'text-[#1C1917] hover:bg-[#F4EFE8]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="pt-2 border-t border-[#1C1917]/8">
            <ClerkAuthControls variant="mobile" onAction={() => setMobileOpen(false)} />
          </div>
        </div>
      </div>
    </header>
  );
}
