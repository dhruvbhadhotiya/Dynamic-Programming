import { Suspense, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { teacherModeClass, useTeacherMode } from '../engine/teacherMode';
import { TeacherBar } from './TeacherBar';

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
        `inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
          isActive
            ? 'bg-brand/10 text-brand underline decoration-2 underline-offset-4'
            : 'text-muted hover:bg-surface hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export function LoadingPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6" aria-busy="true">
      <p role="status" aria-live="polite" className="text-lg text-muted">
        <span aria-hidden="true">
          ⏳{' '}
        </span>
        Loading…
      </p>
    </section>
  );
}

export function AppShell() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const teacherClass = useTeacherMode((state) => teacherModeClass(state));

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('dp-theme', theme);
  }, [theme]);

  function focusMain(event: MouseEvent<HTMLAnchorElement>) {
    // Hash routing would treat "#main" as a route, so move focus manually.
    event.preventDefault();
    document.getElementById('main')?.focus();
  }

  return (
    <div className={`flex min-h-screen flex-col bg-canvas text-ink ${teacherClass}`}>
      <a
        href="#main"
        onClick={focusMain}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-canvas"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
          <Link
            to="/"
            aria-label="DP Playground home"
            className="flex items-center gap-2 font-extrabold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-canvas">
              DP
            </span>
            <span className="hidden sm:inline">Playground</span>
          </Link>
          <nav aria-label="Main" className="order-3 flex w-full flex-1 items-center gap-1 sm:order-none sm:w-auto">
            <NavItem to="/">Roadmap</NavItem>
            <NavItem to="/fibonacci">Fibonacci</NavItem>
            <NavItem to="/cheatsheet">Cheat sheet</NavItem>
          </nav>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas sm:ml-0"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <span aria-hidden>{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 scroll-mt-24 outline-none">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <TeacherBar />
        </div>
        <Suspense fallback={<LoadingPage />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted">
        Built for curious students and busy projectors. Works offline.
      </footer>
    </div>
  );
}
