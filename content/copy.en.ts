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
          { label: 'Documentation', href: '/docs' },
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
      consoleCta: 'Open the console',
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
    contact: {
      heading: 'Talk to us before you need this',
      lede: 'Depth ships before the failure it prevents. If you run a lending market on tokenized equities, the useful conversation is now — while the interface can still change to fit how you read an oracle.',
      cta: 'Email us',
      secondary: 'Open the console',
    },
  },
  app: {
    title: 'Console',
    lede: 'Deploy an adapter, watch what it would hold, and see what a convention mistake costs. Market data is live from Robinhood Chain mainnet; adapter data appears when the contracts are on chain.',
    nav: [
      { label: 'Adapters', href: '/app' },
      { label: 'Calculator', href: '/app/calculator' },
      { label: 'Live data', href: '/board' },
      { label: 'Docs', href: '/docs' },
    ],
    wallet: {
      connect: 'Connect wallet',
      switch: 'Switch network',
      disconnect: 'Disconnect',
      modalTitle: 'Connect a wallet',
      modalNote:
        'Browser wallets only. Depth never asks for a signature to read data — a wallet is needed solely to send the permissionless deploy and commit transactions.',
      none: 'No wallet extension announced itself in this browser.',
      noneCta: 'Install a browser wallet',
      noneHref: 'https://ethereum.org/en/wallets/find-wallet/',
      close: 'Close',
    },
    blocked: {
      notConnected: 'Connect a wallet to send this transaction.',
      wrongNetwork: 'Switch to Robinhood Chain to send this transaction.',
      notDeployed: 'AdapterFactory is not deployed yet.',
      checking: 'Checking the factory on chain…',
      absent: 'The configured factory address holds no factory. Nothing will be sent.',
      unsupported: 'This network is not served by Depth.',
    },
    tx: {
      confirm: 'Confirm in your wallet…',
      pending: 'Pending…',
      done: 'Done',
      failed: 'Transaction failed.',
    },
    notDeployed: {
      heading: 'The adapter contracts are not on chain yet',
      body: 'Every control on this page is written against the final interface. When AdapterFactory is deployed, one address in lib/deployments.ts changes and these controls come alive. Until then the market data is live and the adapter columns read as unavailable rather than as zero.',
    },
    list: {
      heading: 'Adapters',
      lede: 'One adapter per token-and-feed pair. Addresses are deterministic: the factory derives them, so nobody can substitute a different contract at the same address.',
      columns: {
        ticker: 'Ticker',
        offchain: 'Off-chain status',
        age: 'Price age',
        adapter: 'Adapter',
      },
      deploy: 'Deploy',
      deployed: 'Deployed',
      factoryLabel: 'Factory',
      paramQuiet: 'quiet after',
      paramBudget: 'protection budget',
      paramContinuity: 'continuity tolerance',
      paramSequencer: 'sequencer feed',
      sequencerDisabled: 'disabled (none exists on this chain)',
      addressPending: 'Available once the factory is deployed',
      openDetail: 'Open',
    },
    detail: {
      backLabel: 'All adapters',
      livePrice: 'Live feed price',
      livePriceSource: 'Chainlink, on chain',
      heldPrice: 'Held price',
      heldPriceNote: 'What the adapter would serve inside a protection window.',
      budget: 'Protection budget remaining',
      budgetNote: 'When this reaches zero the adapter reverts rather than keep holding.',
      multiplier: 'uiMultiplier',
      stagedMultiplier: 'Staged multiplier',
      multiplierNote: 'A difference between these two is a corporate action in progress.',
      onchainStatus: 'Adapter status (on chain)',
      offchainStatus: 'Classified off chain',
      offchainNote: 'The same rules the adapter applies, run against live data by this site.',
      commit: 'Commit snapshot',
      commitNote:
        'Permissionless and grants nothing. The continuity invariant compares the current round against this snapshot, so its freshness is what the check depends on.',
      committedAt: 'Snapshot age',
      unavailable: 'Not available until the adapter is deployed',
      calculatorLink: 'Open this asset in the calculator',
    },
    calculator: {
      heading: 'What a convention mistake costs',
      lede: 'The same balance, valued three ways. Two of them are wrong, and neither reverts.',
      asset: 'Asset',
      amount: 'Token amount',
      convention: 'The convention your protocol uses',
      correct: 'balanceOf() x Chainlink',
      doubleCounted: 'balanceOfUI() x Chainlink',
      unadjusted: 'balanceOf() x REST quote',
      correctVerdict: 'Correct',
      doubleCountedVerdict: 'Multiplier applied twice',
      unadjustedVerdict: 'Multiplier never applied',
      error: 'Error against the correct valuation',
      unknownAsset:
        'has no on-chain price feed on this chain, so it cannot be valued here. Showing a covered asset instead.',
      exact:
        'Both wrong conventions agree with the correct one while the multiplier is 1.0. They diverge the moment a corporate action lands.',
    },
    snippet: {
      heading: 'Integration',
      lede: 'One address, changed through your existing oracle governance. No code change, no new audit surface.',
      copy: 'Copy',
      copied: 'Copied',
      gateHeading: 'Optional: gate new borrows',
      gateNote:
        'Liquidation protection needs no code change. Preventing new risk from being taken on a held price does, and it is three lines.',
      // The single copy of this snippet. app/docs/page.tsx reads it from here
      // too, so the two pages cannot drift apart.
      gateCode: [
        'require(',
        '  IStockOracleAdapter(oracle).status() == IStockOracleAdapter.Status.NORMAL,',
        '  "market not in normal state"',
        ');',
      ].join('\n'),
    },
    entry: {
      fromBoard: 'Open the console to deploy an adapter for any of these',
      fromDocs: 'Open the console',
    },
  },
  footer: {
    sourceNote: 'Every figure on this page is read from Robinhood Chain mainnet (chain 4663) at the time shown. Nothing is illustrative.',
  },
} as const
