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
} as const
