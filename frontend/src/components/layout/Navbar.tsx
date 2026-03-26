import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MenuIcon } from '@/components/icons/MenuIcon';
import { XIcon } from '@/components/icons/XIcon';
import { MobileMenu } from './MobileMenu';

const navLinks = [
  { label: 'Architecture', href: '#architecture' },
  { label: 'Protocol', href: '#protocol' },
  { label: 'Numbers', href: '#numbers' },
  { label: 'Docs', href: '/docs' },
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
    if (href.startsWith('/')) return;
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
        className={`fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center transition-all duration-500 ${
          scrolled
            ? 'bg-[rgba(0,0,0,0.8)] backdrop-blur-[20px] border-b border-white/[0.06]'
            : 'bg-transparent'
        }`}
      >
        <div className="w-full max-w-[1280px] mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="focus-ring rounded-lg" aria-label="DARA Lend Home">
            <span className="font-headline text-2xl text-primary tracking-wide">DARA</span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) =>
              link.href.startsWith('/') ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className="font-label text-[11px] uppercase tracking-[0.25em] text-text-secondary hover:text-text-primary transition-colors duration-300"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={link.href}
                  onClick={() => handleSmoothScroll(link.href)}
                  className="font-label text-[11px] uppercase tracking-[0.25em] text-text-secondary hover:text-text-primary transition-colors duration-300"
                >
                  {link.label}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/app"
              className="hidden md:inline-flex btn-signature"
            >
              Get Started
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary transition-all duration-200"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <div className="relative w-6 h-6">
                <span className={`absolute inset-0 transition-all duration-300 ${menuOpen ? 'opacity-0 rotate-90' : 'opacity-100 rotate-0'}`}>
                  <MenuIcon size={24} />
                </span>
                <span className={`absolute inset-0 transition-all duration-300 ${menuOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-90'}`}>
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
