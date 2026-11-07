import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something unexpected happened.';

  return (
    <main className="mx-auto max-w-2xl p-8">
      <p className="text-sm font-bold uppercase tracking-wider text-bad">Route error</p>
      <h1 className="mt-2 text-3xl font-bold">This page hit a snag.</h1>
      <p className="mt-3 text-muted">{message}</p>
      <Link
        className="mt-6 inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        to="/"
      >
        Back to the playground
      </Link>
    </main>
  );
}
