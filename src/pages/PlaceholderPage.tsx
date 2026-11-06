import { Link } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
  detail: string;
}

export function PlaceholderPage({ title, detail }: PlaceholderPageProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-sm font-bold uppercase tracking-widest text-brand">DP Playground</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-4 text-lg text-muted">{detail}</p>
      <Link className="mt-8 inline-block rounded-lg bg-brand px-5 py-3 font-semibold text-white" to="/">
        Back to the roadmap
      </Link>
    </section>
  );
}
