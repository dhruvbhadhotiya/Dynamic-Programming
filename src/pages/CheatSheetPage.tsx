import { CATEGORIES, CATEGORY_IDS, problems } from '../engine/registry';

function handlePrint(): void {
  window.print();
}

export function CheatSheetPage() {
  const grouped = CATEGORY_IDS.map((category) => ({
    category,
    info: CATEGORIES[category],
    items: problems.filter((p) => p.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 print:py-4">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-brand">DP Playground</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Cheat Sheet</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">
            Every problem at a glance: its recurrence, state definition, complexity, and visualisation.
          </p>
        </div>
        <div className="no-print flex flex-col items-start gap-2 print:hidden">
          <button type="button" className="btn-primary" onClick={handlePrint}>
            Print cheat sheet
          </button>
          <p className="max-w-xs text-sm text-muted">
            Tip: use Print to save or share a clean copy. Navigation, headers, footers, and this button
            are hidden by the print styles.
          </p>
        </div>
      </header>

      {problems.length === 0 ? (
        <p className="card mt-8 p-6 text-muted" role="status">
          No problems to show yet. Once problems are registered, the cheat sheet will list them here by
          category.
        </p>
      ) : (
        grouped.map(({ category, info, items }) => (
          <section key={category} aria-labelledby={`cheat-${category}`} className="card mt-8 overflow-hidden print:mt-6">
            <div className="border-b border-line px-5 py-4">
              <h2 id={`cheat-${category}`} className="text-2xl font-extrabold tracking-tight">
                <span aria-hidden="true">
                  {info.icon}{' '}
                </span>
                {info.label}
              </h2>
              <p className="mt-1 text-sm text-muted">{info.description}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  {info.label} problems: recurrence, state definition, complexity, and renderer
                </caption>
                <thead>
                  <tr className="border-b border-line bg-canvas">
                    <th scope="col" className="px-5 py-3 font-bold">Problem</th>
                    <th scope="col" className="px-5 py-3 font-bold">Recurrence</th>
                    <th scope="col" className="px-5 py-3 font-bold">State definition</th>
                    <th scope="col" className="px-5 py-3 font-bold">Time</th>
                    <th scope="col" className="px-5 py-3 font-bold">Space</th>
                    <th scope="col" className="px-5 py-3 font-bold">Renderer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((problem) => (
                    <tr key={problem.id} className="align-top">
                      <th scope="row" className="px-5 py-3 font-semibold text-ink">
                        {problem.title}
                        <span className="ml-2 inline-block rounded-full border border-line px-2 py-0.5 text-xs font-semibold capitalize text-muted">
                          {problem.difficulty}
                        </span>
                      </th>
                      <td className="px-5 py-3">
                        <code className="break-words font-mono text-[13px]">{problem.recurrence}</code>
                      </td>
                      <td className="px-5 py-3 text-muted">{problem.stateDefinition}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-[13px]">{problem.complexity.time}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-[13px]">{problem.complexity.space}</td>
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-[13px]">{problem.renderer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </section>
  );
}
