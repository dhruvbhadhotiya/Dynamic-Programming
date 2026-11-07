import { Suspense, lazy } from 'react';
import { createHashRouter } from 'react-router-dom';
import { AppShell, LoadingPage } from '../components/AppShell';
import { RouteError } from '../components/RouteError';
import { PlaceholderPage } from '../pages/PlaceholderPage';

const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })));
const ProblemPage = lazy(() => import('../pages/ProblemPage').then((m) => ({ default: m.ProblemPage })));
const LessonPage = lazy(() => import('../pages/LessonPage').then((m) => ({ default: m.LessonPage })));
const CheatSheetPage = lazy(() =>
  import('../pages/CheatSheetPage').then((m) => ({ default: m.CheatSheetPage })),
);
const FibonacciPage = lazy(() =>
  import('../pages/FibonacciPage').then((m) => ({ default: m.FibonacciPage })),
);

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingPage />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'problem/:id',
        element: (
          <Suspense fallback={<LoadingPage />}>
            <ProblemPage />
          </Suspense>
        ),
      },
      {
        path: 'lesson/:id',
        element: (
          <Suspense fallback={<LoadingPage />}>
            <LessonPage />
          </Suspense>
        ),
      },
      {
        path: 'cheatsheet',
        element: (
          <Suspense fallback={<LoadingPage />}>
            <CheatSheetPage />
          </Suspense>
        ),
      },
      {
        path: 'fibonacci',
        element: (
          <Suspense fallback={<LoadingPage />}>
            <FibonacciPage />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: (
          <PlaceholderPage
            title="Page not found"
            detail="Sorry, we could not find that page. It may have moved or the link may be incorrect. Try the roadmap to keep learning."
          />
        ),
      },
    ],
  },
]);
