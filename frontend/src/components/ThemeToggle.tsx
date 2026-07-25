import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        background: 'var(--surface-2)',
        border: '1px solid var(--line-strong)',
        borderRadius: '100px',
        padding: '7px 12px',
        color: 'var(--text)',
        fontSize: '12px',
        fontFamily: 'var(--mono)',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      {theme === 'dark' ? (
        <>
          <Sun size={15} color="var(--brass)" />
          <span style={{ color: 'var(--text-dim)' }}>Light</span>
        </>
      ) : (
        <>
          <Moon size={15} color="var(--brass)" />
          <span style={{ color: 'var(--text-dim)' }}>Dark</span>
        </>
      )}
    </button>
  );
};
