import { StepRecorder, clamp, create2D, range } from '../../engine/dpHelpers';
import { isRecord } from '../../engine/types';
import type { CellValue, Mode, ProblemModule, Step, Table2DState } from '../../engine/types';

export interface CheapestFlightsKStopsInput { n: number; flights: number[][]; source: number; dst: number; k: number }

interface Flight { from: number; to: number; price: number }

interface FlightModel { n: number; flights: Flight[]; source: number; dst: number; k: number }

const MIN_CITIES = 2;
const MAX_CITIES = 6;
const MAX_FLIGHTS = 8;
const MAX_STOPS = 4;
const INF = Number.POSITIVE_INFINITY;

// Default answer: c0 -> c1 -> c3 = 4 + 3 = 7 with k = 2 stops.
const DEFAULT_INPUT: CheapestFlightsKStopsInput = {
  n: 4,
  flights: [[0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 3], [2, 3, 8]],
  source: 0,
  dst: 3,
  k: 2,
};

const pythonCode = [
  'def cheapest_flights(n, flights, source, dst, k):',
  "    INF = float('inf')",
  '    dp = [[INF] * n for _ in range(k + 1)]',
  '    dp[0][source] = 0',
  '    for u, v, w in flights:',
  '        if u == source:',
  '            dp[0][v] = min(dp[0][v], w)',
  '    for s in range(1, k + 1):',
  '        dp[s] = dp[s - 1][:]',
  '        for u, v, w in flights:',
  '            candidate = dp[s - 1][u] + w',
  '            if candidate < dp[s][v]:',
  '                dp[s][v] = candidate',
  '    answer = dp[k][dst]',
  '    return -1 if answer == INF else answer',
].join('\n');

const javascriptCode = [
  'function cheapestFlights(n, flights, source, dst, k) {',
  '  const INF = Infinity;',
  '  const dp = Array.from({ length: k + 1 }, () => new Array(n).fill(INF));',
  '  dp[0][source] = 0;',
  '  for (const [u, v, w] of flights) {',
  '    if (u === source) {',
  '      dp[0][v] = Math.min(dp[0][v], w);',
  '    }',
  '  }',
  '  for (let s = 1; s <= k; s++) {',
  '    dp[s] = dp[s - 1].slice();',
  '    for (const [u, v, w] of flights) {',
  '      const candidate = dp[s - 1][u] + w;',
  '      if (candidate < dp[s][v]) {',
  '        dp[s][v] = candidate;',
  '      }',
  '    }',
  '  }',
  '  const answer = dp[k][dst];',
  '  return answer === INF ? -1 : answer;',
  '}',
].join('\n');

const cppCode = [
  'int cheapestFlights(int n, vector<array<int, 3>>& flights, int source, int dst, int k) {',
  '  const int INF = 1e9;',
  '  vector<vector<int>> dp(k + 1, vector<int>(n, INF));',
  '  dp[0][source] = 0;',
  '  for (auto [u, v, w] : flights) {',
  '    if (u == source) {',
  '      dp[0][v] = min(dp[0][v], w);',
  '    }',
  '  }',
  '  for (int s = 1; s <= k; s++) {',
  '    dp[s] = dp[s - 1];',
  '    for (auto [u, v, w] : flights) {',
  '      int candidate = dp[s - 1][u] + w;',
  '      if (candidate < dp[s][v]) {',
  '        dp[s][v] = candidate;',
  '      }',
  '    }',
  '  }',
  '  int answer = dp[k][dst];',
  '  return answer == INF ? -1 : answer;',
  '}',
].join('\n');

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function whole(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? Math.trunc(value) : fallback;
}

/** Clamp fields to the schema ranges and drop rows that are not three finite numbers. */
function normalizeInput(input: CheapestFlightsKStopsInput): FlightModel {
  const data: Record<string, unknown> = isRecord(input) ? input : {};
  const n = clamp(whole(data.n, MIN_CITIES), MIN_CITIES, MAX_CITIES);
  const source = clamp(whole(data.source, 0), 0, n - 1);
  const dst = clamp(whole(data.dst, n - 1), 0, n - 1);
  const k = clamp(whole(data.k, 0), 0, MAX_STOPS);
  const rawFlights: unknown[] = Array.isArray(data.flights) ? data.flights : [];
  const flights: Flight[] = [];

  for (const row of rawFlights.slice(0, MAX_FLIGHTS)) {
    if (!Array.isArray(row)) continue;
    const [fromRaw, toRaw, priceRaw] = row;
    if (!isFiniteNumber(fromRaw) || !isFiniteNumber(toRaw) || !isFiniteNumber(priceRaw)) continue;
    const from = clamp(Math.trunc(fromRaw), 0, n - 1);
    const to = clamp(Math.trunc(toRaw), 0, n - 1);
    if (from === to) continue;
    flights.push({ from, to, price: clamp(Math.trunc(priceRaw), 1, 9) });
  }

  return { n, flights, source, dst, k };
}

function display(value: number): CellValue {
  return value === INF ? '∞' : value;
}

function makeRecorder(model: FlightModel): StepRecorder<Table2DState> {
  const { n, source, dst, k } = model;
  return new StepRecorder<Table2DState>(
    {
      kind: 'table2d',
      values: create2D<CellValue>(k + 1, n, () => null),
      rowLabels: range(k + 1).map((s) => `s=${s}`),
      colLabels: range(n).map((city) => `c${city}`),
      rowHeader: 'stops',
      colHeader: `cities · c${source} → c${dst} · k=${k}`,
      caption:
        'dp[s][v] = cheapest cost from the source to city v using at most s stops; ∞ means unreachable',
    },
    { codeLine: 1 },
  );
}

function cheapestFlightsSteps(model: FlightModel): Step[] {
  const { n, flights, source, dst, k } = model;
  const rec = makeRecorder(model);
  const base = new Array<number>(n).fill(INF);
  const dp: number[][] = [
    base,
    ...Array.from({ length: k }, () => new Array<number>(n).fill(INF)),
  ];

  base[source] = 0;
  for (const flight of flights) {
    if (flight.from !== source) continue;
    base[flight.to] = Math.min(base[flight.to] ?? INF, flight.price);
  }

  rec.at(1).record(
    `Cheapest flights from c${source} to c${dst} with at most ${k} stop${k === 1 ? '' : 's'}. Row s answers “at most s stops”, which allows at most s + 1 flights. Each round copies the row above and relaxes every flight from that previous row only, so one round cannot chain several flights.`,
    {
      codeLine: 1,
      highlights: [{ pos: [0, source], kind: 'base', label: 'source' }],
      vars: { n, flights: flights.length, source: `c${source}`, dst: `c${dst}`, k },
    },
  );

  for (let city = 0; city < n; city += 1) {
    const value = base?.[city] ?? INF;
    const isSource = city === source;
    const message = isSource
      ? `Base row: dp[0][c${source}] = 0. Standing at the source costs nothing and uses no flight.`
      : value === INF
        ? `dp[0][c${city}] = ∞. Zero stops allows only direct flights, and none goes from c${source} to c${city}.`
        : `dp[0][c${city}] = ${value}. The direct flight c${source} -> c${city} uses zero stops.`;

    rec.at(isSource ? 4 : 6).fill([0, city], display(value), message, {
      kind: isSource ? 'base' : value === INF ? 'pruned' : 'base',
      label: isSource ? 'source' : value === INF ? 'no direct flight' : 'direct',
      codeLine: isSource ? 4 : 6,
      vars: { s: 0, city: `c${city}`, cost: value === INF ? '∞' : value, stops: 0 },
    });
  }

  for (let s = 1; s <= k; s += 1) {
    const prev = dp[s - 1] ?? [];
    const row = dp[s];
    if (!row) continue;

    for (let city = 0; city < n; city += 1) row[city] = prev[city] ?? INF;

    rec.at(9).update(
      (draft) => {
        const draftRow = draft.values[s];
        if (!draftRow) return;
        for (let city = 0; city < n; city += 1) draftRow[city] = display(prev[city] ?? INF);
      },
      `Row s=${s}: first copy row s=${s - 1}. Every route that already worked with fewer stops still works, so the copy carries the “at most” part of the recurrence.`,
      {
        codeLine: 9,
        highlights: [
          { pos: [s, source], kind: 'base', label: 'copied source' },
          { pos: [s - 1, source], kind: 'dependency', label: 'row above' },
        ],
        vars: { s, stops: s, flights: s + 1 },
      },
    );
    let improved = 0;
    let reachable = 0;

    for (const flight of flights) {
      const baseCost = prev[flight.from] ?? INF;
      if (baseCost === INF) continue;
      reachable += 1;
      const candidate = baseCost + flight.price;
      const current = row[flight.to] ?? INF;
      if (candidate >= current) continue;

      row[flight.to] = candidate;
      improved += 1;
      rec.at(13).fill(
        [s, flight.to],
        candidate,
        `Relax c${flight.from} -> c${flight.to} (price ${flight.price}) using row ${s - 1}: ${baseCost} + ${flight.price} = ${candidate}, beating ${current === INF ? '∞' : current}. Row ${s} now reaches c${flight.to} with at most ${s} stop${s === 1 ? '' : 's'}.`,
        {
          kind: 'active',
          label: `via c${flight.from}`,
          codeLine: 13,
          highlights: [{
            pos: [s - 1, flight.from],
            kind: 'dependency',
            label: `dp[${s - 1}][c${flight.from}] = ${baseCost}`,
          }],
          vars: { s, from: `c${flight.from}`, to: `c${flight.to}`, price: flight.price, candidate, improved },
        },
      );
    }

    const reachedDst = row[dst] ?? INF;
    rec.at(8).record(
      improved === 0
        ? `Row s=${s} found no cheaper route, so one extra stop cannot help here; later rows would only copy the same values.`
        : `Row s=${s} is final: ${improved} improvement${improved === 1 ? '' : 's'} across ${reachable} reachable relaxation${reachable === 1 ? '' : 's'}. It holds the cheapest cost with at most ${s} stops (${s + 1} flights).`,
      {
        codeLine: 8,
        highlights: [{
          pos: [s, dst],
          kind: reachedDst === INF ? 'pruned' : 'path',
          label: reachedDst === INF ? 'still unreachable' : `cost ${reachedDst}`,
        }],
        vars: { s, improved, reachable, flights: flights.length },
      },
    );
  }

  const target = dp[k]?.[dst] ?? INF;
  const answer = target === INF ? -1 : target;

  rec.at(14).record(
    answer < 0
      ? `The answer is -1 — c${dst} cannot be reached from c${source} using at most ${k} stop${k === 1 ? '' : 's'}.`
      : `The answer is ${answer} — the cheapest cost from c${source} to c${dst} using at most ${k} stop${k === 1 ? '' : 's'} (${k + 1} flights).`,
    {
      codeLine: 14,
      highlights: [
        { pos: [k, dst], kind: 'result', label: 'answer' },
        { pos: [0, source], kind: 'base', label: 'source' },
      ],
      vars: { answer, source: `c${source}`, dst: `c${dst}`, k, stops: k },
    },
  );

  return [...rec.steps];
}

const cheapestFlightsKStopsModule: ProblemModule<CheapestFlightsKStopsInput> = {
  id: 'cheapest-flights-k-stops',
  title: 'Cheapest Flights Within K Stops',
  category: 'graphs',
  difficulty: 'medium',
  summary:
    'Find the cheapest route from a source city to a destination using at most k stops. Layer s of the table stores the cheapest cost with at most s stops; it copies layer s-1 and relaxes every flight from that previous layer, so a single round never chains flights.',
  stateDefinition:
    'dp[s][v] = cheapest cost from the source to city v using at most s stops, which means at most s + 1 flights. Row 0 holds the source at cost 0 and every direct flight out of the source. The answer is dp[k][dst], or -1 when it is still ∞.',
  recurrence:
    'dp[s][v] = min(dp[s-1][v], min over flights u -> v of dp[s-1][u] + price). Relaxing only from row s-1 keeps each round to one additional flight. Unreachable cells stay ∞.',
  complexity: { time: 'O(k * E)', space: 'O(k * n)' },
  renderer: 'table2d',
  inputSchema: [
    {
      name: 'n', label: 'cities n', type: 'number', min: MIN_CITIES, max: MAX_CITIES,
      help: 'Number of cities, labelled c0 … c(n-1). Two to six keeps every layer readable.',
    },
    {
      name: 'flights', label: 'flights [from, to, price]', type: 'matrix',
      minRows: 1, maxRows: MAX_FLIGHTS, maxCols: 3, min: 0, max: 9, numeric: true,
      help: 'One flight per row. Endpoints are clamped to 0 … n-1, prices to 1–9. Up to eight rows.',
    },
    {
      name: 'source', label: 'source city', type: 'number', min: 0, max: 5,
      help: 'Starting city; clamped to 0 … n-1.',
    },
    {
      name: 'dst', label: 'destination city', type: 'number', min: 0, max: 5,
      help: 'Target city; clamped to 0 … n-1.',
    },
    {
      name: 'k', label: 'max stops k', type: 'number', min: 0, max: MAX_STOPS,
      help: 'At most k intermediate cities, so at most k + 1 flights.',
    },
  ],
  defaultInput: DEFAULT_INPUT,
  modes: ['tabulation'],
  generateSteps(input: CheapestFlightsKStopsInput, mode: Mode): Step[] {
    void mode;
    return cheapestFlightsSteps(normalizeInput(input));
  },
  code: { python: pythonCode, javascript: javascriptCode, cpp: cppCode },
  quiz: [
    {
      q: 'For the default flights (n=4, source=0, dst=3, k=2), what is the cheapest cost?',
      options: ['7', '6', '9', '13'],
      answer: 0,
      why: 'c0 -> c1 -> c3 costs 4 + 3 = 7 and uses one stop. The direct c0 -> c2 -> c3 route costs 10, and c0 -> c1 -> c2 -> c3 costs 13.',
    },
    {
      q: 'What does dp[s][v] store?',
      options: ['Cheapest cost from the source to v using at most s stops (at most s + 1 flights)', 'Cheapest cost using exactly s flights', 'The number of routes to v with exactly s stops', 'The cheapest direct flight from v to the destination'],
      answer: 0,
      why: 'The row index is the stop budget, not the flight count. A route with s stops uses s + 1 flights, and the “at most” meaning keeps earlier routes in the copied row.',
    },
    {
      q: 'Why does each round relax flights only from the previous row?',
      options: ['So one round adds exactly one flight, preventing several flights from being chained inside the same stop layer', 'Because the previous row always contains the final answer', 'Because flights are sorted by price', 'To avoid copying the row before relaxing'],
      answer: 0,
      why: 'If a round read the row it is writing, a path could use many flights at the cost of one stop, and the stop limit would no longer be respected.',
    },
    {
      q: 'What happens when k = 0?',
      options: ['Only direct flights from the source are allowed', 'Any route with one stop is allowed', 'The answer is always -1', 'All cities become reachable at cost 0'],
      answer: 0,
      why: 'Zero stops means zero intermediate cities, so a route can use only the single direct flight from the source to the destination.',
    },
  ],
  relatedIds: ['bellman-ford', 'floyd-warshall'],
  lessonId: 'graphs',
};

export default cheapestFlightsKStopsModule;
