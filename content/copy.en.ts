export const copy = {
  brand: 'Depth',
  // INTERIM — replace with the real address before deploying (Task 12).
  contactEmail: 'hello@example.com',

  nav: {
    items: [
      { label: 'Problem', href: '#problem' },
      {
        label: 'How it works',
        href: '#mechanism',
        children: [
          { label: 'Canonical valuation', href: '#mechanism' },
          { label: 'Liquidation shield', href: '#mechanism' },
          { label: 'Continuity invariant', href: '#mechanism' },
        ],
      },
      { label: 'Live data', href: '/board' },
      { label: 'Trust model', href: '#limits' },
      {
        label: 'Resources',
        href: '#',
        children: [
          { label: 'ERC-8056', href: 'https://eips.ethereum.org/EIPS/eip-8056', external: true },
          { label: 'Chainlink feeds', href: 'https://docs.chain.link/data-feeds/tokenized-equity-feeds/robinhood', external: true },
          { label: 'Robinhood Chain docs', href: 'https://docs.robinhood.com/chain/stock-tokens/', external: true },
        ],
      },
    ],
    secondary: { label: 'Documentation', href: '/docs' },
    primary: { label: 'Get in touch', href: '#contact' },
  },

  hero: {
    // 2 lines, ~18 characters each (brief §1)
    h1: ['Corporate actions', 'break collateral'],
    // 2 lines, ~48 characters each
    sub: 'One oracle address that stops splits, pauses and stale feeds from liquidating healthy positions.',
    cta: { label: 'See live data', href: '/board' },
    cardA: {
      label: 'Already happened',
      statement: ['CRWD split 4:1 with no', 'on-chain price feed'],
    },
    cardB: {
      label: 'TSLA price age · Chainlink',
    },
  },
  sections: {
    problem: {
      heading: 'Tokenized equities carry a second set of books',
      lede: 'Balances stay raw. Prices already carry the corporate-action multiplier. Mixing the two conventions is silent and expensive.',
      stats: [
        { label: 'Tokenized assets on Robinhood Chain' },
        { label: 'Covered by an on-chain price feed' },
        { label: 'With no on-chain price at all' },
      ],
    },
    matrix: {
      heading: 'Two right answers and two wrong ones',
      lede: 'The naive integration is accidentally correct. The careful one, which reads the multiplier and applies it, is the one that breaks.',
      rows: [
        { balance: 'balanceOf()', price: 'Chainlink feed', verdict: 'correct', note: 'The multiplier is applied exactly once, inside the price.' },
        { balance: 'balanceOfUI()', price: 'Chainlink feed', verdict: 'wrong', note: 'Multiplier applied twice. On a 4:1 split this overvalues collateral fourfold.' },
        { balance: 'balanceOf()', price: 'REST /prices', verdict: 'wrong', note: 'Multiplier applied zero times. Collateral is undervalued and healthy positions are liquidated.' },
        { balance: 'balanceOfUI()', price: 'REST /prices', verdict: 'correct', note: 'Both sides use the unadjusted convention.' },
      ],
    },
    mechanism: {
      heading: 'A fuse between the price and the protocol',
      lede: 'The adapter is an AggregatorV3-compatible contract. It classifies the moment before it answers, and holds the last trustworthy price when the moment is unsafe.',
      states: [
        { name: 'Normal', body: 'Feed is fresh, no action staged. The price passes through untouched.' },
        { name: 'Quiet', body: 'The feed is silent but inside its 24-hour heartbeat. Equities trade 24/5; this chain runs 24/7.' },
        { name: 'Corporate action', body: 'The oracle is paused or a new multiplier is staged. The pre-window price is held.' },
        { name: 'Desync', body: 'Price moved by the multiplier ratio, which a split must never do. Protection engages without waiting for the issuer to pause.' },
        { name: 'Token halted', body: 'Transfers are paused on the token contract itself.' },
        { name: 'Unsafe', body: 'The protection budget is spent. The adapter reverts rather than answering with a stale number.' },
      ],
      invariantHeading: 'Why a held price cannot be abused',
      invariantBody:
        'The held price is the one that stood before the window opened, and it is the same for everyone. A position cannot enter the window healthier than it was. Anyone already underwater stays underwater and stays liquidatable. The window removes the artefact, not the debt.',
    },
    integration: {
      heading: 'One address',
      lede: 'No code changes, no second audit. Point the oracle at the adapter and the protection is live.',
      before: 'oracle: 0x4A1166a659A55625345e9515b32adECea5547C38 // Chainlink RHTSLA/USD',
      after: 'oracle: 0x0000000000000000000000000000000000000000 // adapter — not yet deployed',
      note: 'Adapter contracts are not deployed yet. This page ships before them, and the address above is a placeholder until testnet.',
    },
    limits: {
      heading: 'What this does not do',
      lede: 'Publishing the boundary is part of the product. A protocol that cannot see the edges cannot price the risk.',
      items: [
        { title: 'It does not stop new borrowing against a held price', body: 'An oracle cannot see who is calling it. Liquidation protection needs zero changes; gating new borrows on a normal status is a three-line opt-in.' },
        { title: 'It does not price the assets with no feed', body: 'Most tokenized assets on this chain have no on-chain price at all. The adapter guards the feeds that exist; it does not invent the ones that do not.' },
        { title: 'It does not detect a sequencer outage today', body: 'No sequencer uptime feed exists on this chain. The state is built and dormant, and switches on the day one is published.' },
        { title: 'It cannot tell a closed market from a broken oracle', body: 'Solidity has no calendar. Both cases resolve to the same conservative behaviour, so the ambiguity is safe — silence is never served as a fresh price.' },
      ],
    },
  },
  footer: {
    sourceNote: 'Every figure on this page is read from Robinhood Chain mainnet (chain 4663) at the time shown. Nothing is illustrative.',
  },
} as const
