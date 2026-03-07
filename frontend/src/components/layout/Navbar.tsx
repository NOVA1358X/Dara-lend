import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/shared/Logo';
import { MenuIcon } from '@/components/icons/MenuIcon';
import { XIcon } from '@/components/icons/XIcon';
import { MobileMenu } from './MobileMenu';

const navLinks = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'Cross-Chain', href: '#cross-chain' },
  { label: 'Security', href: '#security' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const handleSmoothScroll = (href: string) => {
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMenuOpen(false);
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-300 ${
          scrolled
            ? 'bg-[rgba(8,10,18,0.85)] backdrop-blur-[16px] border-b border-[rgba(255,255,255,0.05)]'
            : 'bg-transparent'
        }`}
      >
        <div className="w-full max-w-[1280px] mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="focus-ring rounded-lg" aria-label="DARA Lend Home">
            <Logo />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleSmoothScroll(link.href)}
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="hidden md:inline-flex items-center px-6 py-2.5 rounded-lg bg-accent text-bg-primary text-sm font-medium hover:bg-accent-hover transition-colors duration-200 focus-ring"
            >
              Launch App
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-all duration-200 focus-ring"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <div className="relative w-6 h-6">
                <span
                  className={`absolute inset-0 transition-all duration-300 ${
                    menuOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'
                  }`}
                >
                  <MenuIcon size={24} />
                </span>
                <span
                  className={`absolute inset-0 transition-all duration-300 ${
                    menuOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'
                  }`}
                >
                  <XIcon size={24} />
                </span>
              </div>
            </button>
          </div>
        </div>
      </nav>

      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        links={navLinks}
        onLinkClick={handleSmoothScroll}
      />
    </>
  );
}
