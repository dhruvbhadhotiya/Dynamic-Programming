import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('dp-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
          isActive ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-surface hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export function AppShell() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('dp-theme', theme);
  }, [theme]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
              DP
            </span>
            <span className="hidden sm:inline">Playground</span>
          </Link>
          <nav aria-label="Main" className="flex flex-1 items-center gap-1">
            <NavItem to="/">Roadmap</NavItem>
            <NavItem to="/fibonacci">Fibonacci</NavItem>
            <NavItem to="/cheatsheet">Cheat sheet</NavItem>
          </nav>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-brand"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted">
        Built for curious students and busy projectors. Works offline.
      </footer>
    </div>
  );
}
