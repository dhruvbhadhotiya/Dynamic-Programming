import { createHashRouter } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { RouteError } from '../components/RouteError';
import { PlaceholderPage } from '../pages/PlaceholderPage';

const placeholder = (title: string, detail: string) => <PlaceholderPage title={title} detail={detail} />;

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: placeholder('DP Playground', 'The learning roadmap is being built.') },
      { path: 'problem/:id', element: placeholder('Problem', 'This visualization is coming next.') },
      { path: 'lesson/:id', element: placeholder('Lesson', 'This lesson is coming next.') },
      { path: 'cheatsheet', element: placeholder('Cheat sheet', 'A printable summary is coming next.') },
      { path: 'fibonacci', element: placeholder('Fibonacci lab', 'The flagship demo is coming next.') },
      { path: '*', element: placeholder('Not found', 'Try heading back home.') },
    ],
  },
]);
