import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <>
      <nav className={`nav ${isScrolled ? 'is-scrolled' : ''}`} id="nav">
        <div className="nav-brand">
          <Link to="/" onClick={closeMobileMenu} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#D9A94E" strokeWidth="2" />
              <path
                d="M12 20.5L17 26L28.5 13"
                stroke="#D9A94E"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Credo
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="nav-links">
          <a href="#principles">Product</a>
          <a href="#pipeline">How it works</a>
          <a href="#transparency">Transparency</a>
          <ThemeToggle />
          <Link to="/login" style={{ fontSize: '13.5px', color: 'var(--text-dim)', fontWeight: 500 }}>
            Sign in
          </Link>
          <Link to="/dashboard" className="nav-cta" data-magnetic>
            Launch App
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="nav-mobile-toggle">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line-strong)',
              borderRadius: '8px',
              padding: '8px',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="mobile-nav-overlay">
          <div className="mobile-nav-links">
            <a href="#principles" onClick={closeMobileMenu}>Product</a>
            <a href="#pipeline" onClick={closeMobileMenu}>How it works</a>
            <a href="#transparency" onClick={closeMobileMenu}>Transparency</a>
            <Link to="/login" onClick={closeMobileMenu} style={{ color: 'var(--text)', fontWeight: 600 }}>
              Sign in
            </Link>
            <Link to="/dashboard" onClick={closeMobileMenu} className="nav-cta" style={{ textAlign: 'center', marginTop: '10px' }}>
              Launch App
            </Link>
          </div>
        </div>
      )}
    </>
  );
};
