import { StepRecorder } from '../engine/dpHelpers';
import type { Lesson } from '../engine/lessonTypes';
import type { Step, Table1DState } from '../engine/types';

function buildDiagramSteps(): Step[] {
  const prices = [1, 2, 3, 0, 2];
  const n = prices.length;
  const rec = new StepRecorder<Table1DState>(
    {
      kind: 'table1d',
      values: Array.from({ length: n }, () => null),
      labels: Array.from({ length: n }, (_value, i) => `cash[${i}]`),
      indexName: 'i',
      caption: 'Cooldown walkthrough: cash[i] = best profit in cash after day i for prices [1, 2, 3, 0, 2]',
    },
    { codeLine: 1 },
  );

  rec.at(1).record(
    'State machine walkthrough: three states — hold (holding one share), cash (free to buy), and just-sold (in cooldown, cannot buy today). The table records only cash[i], the best profit that is safe to buy from on day i+1.',
    {
      codeLine: 1,
      highlights: [{ pos: [0], kind: 'active' }],
      vars: { i: 0, p: prices[0] ?? 0, hold: -1e9, cash: 0, answer: 0 },
    },
  );

  const NEG = -1e9;
  let hold = NEG;
  let cash = 0;
  let cool = NEG;

  const messages = [
    'Day 0, price 1: hold = max(-inf, 0 - 1) = -1 (buy today), cash stays 0, just-sold is still impossible. cash[0] = 0.',
    'Day 1, price 2: hold stays -1 (buying again at 2 is worse), just-sold = -1 + 2 = 1 (sell today), cash stays 0 because the cooldown has not expired yet. cash[1] = 0.',
    'Day 2, price 3: hold stays -1, just-sold = -1 + 3 = 2 (sell today), cash = max(0, just-sold yesterday 1) = 1 — yesterday\'s cooldown expired. cash[2] = 1. Selling today gives 2, but it is not cash yet.',
    'Day 3, price 0: hold = max(-1, 1 - 0) = 1 (buy at 0 using cash 1 — legal, because the day-1 sale has cooled down), just-sold = -1 + 0 = -1 (selling today loses), cash = max(1, just-sold yesterday 2) = 2. cash[3] = 2.',
    'Day 4, price 2: hold stays 1 (re-buying at 2 is worse than holding from 0), just-sold = 1 + 2 = 3 (sell the share bought on day 3), cash stays 2. cash[4] = 2.',
  ];

  for (let i = 0; i < n; i += 1) {
    const p = prices[i] ?? 0;
    const prevHold = hold;
    const prevCash = cash;
    const prevCool = cool;
    const nextHold = Math.max(prevHold, prevCash - p);
    const nextCool = prevHold + p;
    const nextCash = Math.max(prevCash, prevCool);
    hold = nextHold;
    cool = nextCool;
    cash = nextCash;
    const dependency =
      i > 0 ? [{ pos: [i - 1], kind: 'dependency' as const, label: `cash[${i - 1}]` }] : [];
    rec.at(3).fill([i], cash, messages[i] ?? `Day ${i}, price ${p}: cash[${i}] = ${cash}.`, {
      codeLine: 3,
      highlights: dependency,
      vars: { i, p, hold, cash, answer: cash },
    });
  }

  rec.at(5).record(
    'The answer is max(cash, just-sold) = max(2, 3) = 3: buy at 1 sell at 2 (+1), wait out the cooldown on day 2, buy at 0 sell at 2 (+2). cash[4] alone is 2 because the final sale is still in the just-sold state.',
    {
      codeLine: 5,
      highlights: [{ pos: [n - 1], kind: 'result', label: 'answer' }],
      vars: { answer: 3, cash, hold },
    },
  );

  return [...rec.steps];
}

const lesson: Lesson = {
  id: 'stocks',
  title: 'Stock DP as a State Machine',
  category: 'stocks',
  summary:
    'Stock DP is a two-state machine: cash (no share, free to buy) and hold (holding one share). Each price applies the same two transitions — buy moves cash to hold, sell moves hold to cash — and every variant (cooldown, fee, at most k trades) is a small change to the states or the edge costs, not a new algorithm.',
  sections: [
    {
      heading: 'Two states: cash and hold',
      body: 'Name the states before writing any recurrence. After processing day i, you either hold one share (hold[i]: the best net profit you can have while holding, e.g. -1 after buying at 1) or you hold no share (cash[i]: the best profit with empty hands, e.g. 2 after selling). Total profit alone is not a state because the same profit means different futures: cash can buy tomorrow, hold can sell tomorrow.\n\nInitialise hold to -infinity (impossible) and cash to 0 (do nothing). Prices are processed left-to-right, so after day i both values summarise every legal buy/sell history in prices[0..i]. The final answer is always cash at the end — an unsold share is unrealised profit and never counts.',
      bullets: [
        'cash[i]: best profit with no share after day i — free to buy on day i+1.',
        'hold[i]: best profit while holding one share after day i.',
        'hold starts at -inf (impossible), cash starts at 0 (do nothing).',
        'Answer is cash[n-1] — never report an unsold share as profit.',
      ],
      callout: 'Write cash and hold as full sentences — "holding / not holding after day i" — before touching the code.',
    },
    {
      heading: 'The two transitions',
      body: 'Each new price p applies exactly two moves. Buy: hold = max(hold, cash - p) — either keep the share you already hold, or buy now for p from yesterday\'s cash. Sell: cash = max(cash, hold + p) — either stay in cash, or sell the share you held yesterday for p.\n\nUse yesterday\'s values on both sides so one day is never used for both a buy and a sell. In code this is why the updates read the previous pair (prevHold, prevCash) or run sell before buy: hold + p must not use a share bought at the same price. The walkthrough in the diagram runs this loop five times, filling cash[0..4] = 0, 0, 1, 2, 2.',
      bullets: [
        'Buy: hold = max(hold, cashPrev - p).',
        'Sell: cash = max(cash, holdPrev + p).',
        'Both right-hand sides read yesterday\'s pair — never the value just written today.',
        'Diagram: cash[0..4] = 0, 0, 1, 2, 2 for prices [1, 2, 3, 0, 2].',
      ],
      callout: 'Same price, two arrows: cash -> hold costs p, hold -> cash gains p. Everything else is bookkeeping.',
    },
    {
      heading: 'Cooldown and fee: variants as state changes',
      body: 'A cooldown is not a new idea — it is a third state. Add cool (just sold): buying is only allowed from cash, never from cool. The transitions become hold = max(hold, cash - p), cool = holdPrev + p, cash = max(cash, coolPrev). A sale lands in cool today and only matures into cash tomorrow. In the diagram that forbids buying at day 3 with the day-2 sale (price 3), but allows buying at day 3 with the day-1 sale (price 2): hold becomes 1, and the optimal plan is buy 1 sell 2 (+1), cool down, buy 0 sell 2 (+2) for 3.\n\nA transaction fee changes an edge cost, not a state. Sell becomes hold + p - fee (or buy becomes cash - p - fee — pick one convention and hold it). Because only the sell arrow changes, the rest of the machine — initial values, update order, final cash — stays identical.',
      bullets: [
        'Cooldown = third state just-sold; buy only from cash, never from just-sold.',
        'cool = holdPrev + p; cash = max(cash, coolPrev) — the sale matures one day later.',
        'Fee = subtract on the sell edge: cash = max(cash, holdPrev + p - fee).',
        'Final answer with cooldown is max(cash, cool) — the last sale may still sit in cool.',
      ],
      callout: 'Ask "what extra fact matters tomorrow?" — that fact is a new state. Cooldown adds one; a fee only rewrites one arrow.',
    },
    {
      heading: 'k transactions: copy the pair k times',
      body: 'At most k transactions generalises by copying the cash/hold pair k times: hold1/cash1 for the first trade, hold2/cash2 for the second, up to holdk/cashk. Each level is the same two arrows as the base case. The bridge between levels is the buy: hold2 = max(hold2, cash1 - p) — you can only start trade 2 after trade 1 has sold into cash1.\n\nThat is exactly why Best Time to Buy and Sell Stock III needs four scalars and updates them in reverse order (cash2, hold2, cash1, hold1): reverse order keeps yesterday\'s values frozen so a single day cannot fund two trades. The answer is cashk, and with k large enough (k >= n/2) the machine collapses to unlimited trades — sell every rise — which is why large-k inputs are clamped instead of building hundreds of pairs.',
      bullets: [
        'k trades = k cash/hold pairs: hold1/cash1, ..., holdk/cashk.',
        'Level t buys from cash(t-1): holdt = max(holdt, cash(t-1) - p).',
        'Update in reverse (cashk first) so one day never funds two trades.',
        'Answer is cashk; k >= n/2 means unlimited trades — clamp k in code.',
      ],
      callout: 'k is a counter of pairs, not a new trick: each extra trade is one more cash/hold staircase.',
    },
    {
      heading: 'Common pitfalls',
      body: 'The classic bug is update order. Writing cash = max(cash, hold + p) and then hold = max(hold, cash - p) with the fresh cash lets a same-day sell fund a same-day buy, inflating profit on flat prices. Read yesterday\'s pair (or update sell before buy, or keep prevCash/prevHold temporaries) and hand-check a flat array like [2, 2]: the answer must be 0, not a phantom profit.\n\nThe second classic is reporting hold as profit. Ending with hold = -1 on prices [1, 2, 3, 0, 2] (before the final sale) does not mean the answer is -1 — you can always sell or never buy, so cash dominates. Initialise hold to -infinity (or -1e9) so the first buy is forced to come from cash = 0, and never let a -inf + p overflow into a real number.',
      bullets: [
        'Same-day cheat: never let today\'s sell fund today\'s buy — read yesterday\'s pair.',
        'Flat prices [2, 2] must answer 0; if you get profit, your update order is wrong.',
        'Answer is cash (or max(cash, cool) with cooldown), never hold.',
        'hold = -inf at the start; do not start hold at 0 or -p inconsistently across variants.',
      ],
      callout: 'Hand-check [2, 2] (answer 0) and [1] (answer 0) before trusting any state machine.',
    },
  ],
  diagram: {
    rendererId: 'table1d',
    steps: buildDiagramSteps(),
  },
};

export default lesson;
