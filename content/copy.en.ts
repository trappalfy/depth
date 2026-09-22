// INTERIM — replace with the real address before deploying (Task 12). It is
// load-bearing: the navbar's only button, the footer and /docs all mail here.
const contactEmail = 'hello@example.com'

export const copy = {
  brand: 'Depth',
  contactEmail,

  nav: {
    items: [
      { label: 'Problem', href: '#problem' },
      {
        label: 'How it works',
        href: '#mechanism',
        children: [
          { label: 'Canonical valuation', href: '#matrix' },
          { label: 'Liquidation shield', href: '#mechanism' },
          { label: 'Continuity invariant', href: '#invariant' },
        ],
      },
      { label: 'Live data', href: '/board' },
      { label: 'Token', href: '/token' },
      {
        label: 'Resources',
        children: [
          { label: 'ERC-8056', href: 'https://eips.ethereum.org/EIPS/eip-8056', external: true },
          { label: 'Chainlink feeds', href: 'https://docs.chain.link/data-feeds/tokenized-equity-feeds/robinhood', external: true },
          { label: 'Robinhood Chain docs', href: 'https://docs.robinhood.com/chain/stock-tokens/', external: true },
        ],
      },
    ],
    primary: { label: 'Get in touch', href: `mailto:${contactEmail}` },
  },

  hero: {
    // 2 lines, ~18 characters each (brief §1)
    h1: ['Corporate actions', 'break collateral'],
    // 2 lines, ~48 characters each
    sub: 'One oracle address that stops splits, pauses and stale feeds from liquidating healthy positions.',
    cta: { label: 'See live data', href: '/board' },
    cardA: {
      label: 'Already happened',
      statement: ['CRWD split 4:1 —', 'no on-chain feed'],
    },
    cardB: {
      label: 'TSLA price age · Chainlink',
      arrowLabel: 'See every feed on the live board',
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
      chartHeading: 'How old the prices are, right now',
      chartLede:
        'Every covered feed, sorted by how long it has been silent, against the 24-hour heartbeat it is allowed. A feed near the dashed line is still "fresh" by its own contract and hours behind the market.',
      chartAlt:
        'Covered price feeds sorted by age against their 24-hour heartbeat allowance.',
      chartAxis: 'covered feeds, freshest first',
      chartCaption:
        'A cross-section of the feeds at one instant, not a history — this site stores none. Read from Robinhood Chain mainnet',
    },
    matrix: {
      heading: 'Two right answers and two wrong ones',
      lede: 'The naive integration is accidentally correct. The careful one, which reads the multiplier and applies it, is the one that breaks.',
      // Rendered as an actual 2x2 so the diagonal is visible: the correct
      // answers are the two consistent pairs, and the heading's claim becomes
      // something the reader can see rather than count.
      balanceAxis: 'Balance read as',
      priceAxis: 'Price read from',
      balances: ['balanceOf()', 'balanceOfUI()'],
      prices: ['Chainlink feed', 'REST /prices'],
      diagonalNote:
        'The correct answers sit on the diagonal: each applies the multiplier exactly once. Every mixed pair applies it twice or not at all, and neither reverts.',
      rows: [
        { balance: 'balanceOf()', price: 'Chainlink feed', verdict: 'correct', factor: 'x1', note: 'The multiplier is applied exactly once, inside the price.' },
        { balance: 'balanceOfUI()', price: 'Chainlink feed', verdict: 'wrong', factor: 'x m', note: 'Multiplier applied twice. On a 4:1 split this overvalues collateral fourfold.' },
        { balance: 'balanceOf()', price: 'REST /prices', verdict: 'wrong', factor: '/ m', note: 'Multiplier applied zero times. Collateral is undervalued and healthy positions are liquidated.' },
        { balance: 'balanceOfUI()', price: 'REST /prices', verdict: 'correct', factor: 'x1', note: 'Both sides use the unadjusted convention.' },
      ],
    },
    mechanism: {
      heading: 'A fuse between the price and the protocol',
      lede: 'The adapter is an AggregatorV3-compatible contract. It classifies the moment before it answers, and holds the last trustworthy price when the moment is unsafe.',
      // `status` ties a described state to the off-chain classifier in
      // lib/status.ts, so the census below can count the live market against
      // the same vocabulary. null means the state has no off-chain counterpart
      // and cannot be counted from feed data alone.
      states: [
        { name: 'Normal', status: 'NORMAL', body: 'Feed is fresh, no action staged. The price passes through untouched.' },
        { name: 'Quiet', status: 'OFF_HOURS', body: 'The feed is silent but inside its 24-hour heartbeat. Equities trade 24/5; this chain runs 24/7.' },
        { name: 'Corporate action', status: 'CORPORATE_ACTION', body: 'The oracle is paused or a new multiplier is staged. The pre-window price is held.' },
        { name: 'Token halted', status: 'TOKEN_HALTED', body: 'Transfers are paused on the token contract itself.' },
        { name: 'Past heartbeat', status: 'STALE', body: 'The feed has gone longer than its own heartbeat without publishing. Nothing about it can be called fresh.' },
        { name: 'Desync', status: null, body: 'Price moved by the multiplier ratio, which a split must never do. Protection engages without waiting for the issuer to pause. Detecting it needs the adapter\u2019s own committed snapshot, so it cannot be counted from feed data alone.' },
        { name: 'Unsafe', status: null, body: 'The protection budget is spent. The adapter reverts rather than answering with a stale number. It is a property of a deployed adapter, not of the market.' },
      ],
      censusHeading: 'Where the market sits right now',
      censusLede:
        'The same rules, run against every covered feed this second. A zero is a finding, not an empty slot: it says no feed is in that state at the moment you are reading.',
      censusUncountable: 'Needs a deployed adapter',
      censusFootnote:
        'Desync and Unsafe carry no count: one needs the adapter\u2019s own committed snapshot and the other is a property of a deployed contract, so neither can be read from feed data. Showing them as zero would claim knowledge we do not have.',

      // A fuse conducts, then holds, then blows. The adapter has the same four
      // answers, and every state belongs to exactly one of them — which is the
      // section's own metaphor, made visible instead of described.
      tiersHeading: 'Four answers, and every state is one of them',
      tiers: [
        {
          name: 'Passes it through',
          body: 'The price is fresh and nothing is staged. The adapter answers with the feed\u2019s own number and adds nothing to it.',
          states: ['Normal'],
        },
        {
          name: 'Serves the last price',
          body: 'The feed is silent but every flag is clean and the continuity invariant holds. The last published price still stands: silence is not the same as breakage.',
          states: ['Quiet'],
        },
        {
          name: 'Holds the pre-window price',
          body: 'Something makes the current number untrustworthy. The adapter answers with the price that stood before the window opened \u2014 the same number for everyone, so no position enters the window healthier than it was.',
          states: ['Corporate action', 'Desync', 'Token halted', 'Past heartbeat'],
        },
        {
          name: 'Refuses to answer',
          body: 'The protection budget is spent. The adapter reverts rather than serve a number it can no longer stand behind. Breaking loudly beats lying quietly.',
          states: ['Unsafe'],
        },
      ],
      invariantHeading: 'Why a held price cannot be abused',
      invariantBody:
        'The held price is the one that stood before the window opened, and it is the same for everyone. A position cannot enter the window healthier than it was. Anyone already underwater stays underwater and stays liquidatable. The window removes the artefact, not the debt.',
    },
    integration: {
      heading: 'One address',
      lede: 'No code changes, no second audit. Point the oracle at the adapter and the protection is live.',
      before: 'oracle: 0x4A1166a659A55625345e9515b32adECea5547C38 // Chainlink RHTSLA/USD',
      after: 'oracle: 0x0000000000000000000000000000000000000000 // Depth adapter — RHTSLA/USD',
      note: 'The adapter address is issued by the factory the moment you deploy one, and it is deterministic in the token and the feed. The zero above stands in until the factory is on chain.',
      consoleCta: 'Open the console',
    },
    limits: {
      heading: 'What this does not do',
      lede: 'Publishing the boundary is part of the product. A protocol that cannot see the edges cannot price the risk.',
      // Every boundary carries what covers it. A limitation with no answer is
      // an apology; a limitation with an answer is a scope.
      coverLabel: 'What covers it',
      coverageLabel: 'Assets with an on-chain price',
      items: [
        {
          title: 'It does not stop new borrowing against a held price',
          body: 'An oracle cannot see who is calling it. Freezing the price protects a position from a false liquidation, but it does not stop the same borrower taking on more debt at that frozen number.',
          cover: 'Three lines on your side: gate new borrows on status() == NORMAL. Liquidation protection itself needs no code change at all.',
        },
        {
          title: 'It does not price the assets with no feed',
          body: 'Most tokenized assets on this chain have no on-chain price whatsoever. The adapter guards the feeds that exist; it does not invent the ones that do not.',
          cover: 'Nothing, and deliberately so. Inventing a price for an unpriced asset is the failure this product exists to prevent.',
        },
        {
          title: 'It does not detect a sequencer outage today',
          body: 'No sequencer uptime feed has been published on this chain, so there is nothing for the check to read.',
          cover: 'The state is built and dormant. The constructor takes an uptime feed address, and a zero disables it — the day Chainlink publishes one, a new deployment switches it on with no change to the logic.',
        },
        {
          title: 'It cannot tell a closed market from a broken oracle',
          body: 'Solidity has no calendar, and hard-coding an exchange holiday table into an immutable contract guarantees it will one day be wrong.',
          cover: 'Both cases resolve to the same conservative behaviour, which makes the ambiguity safe: silence is never served as a fresh price, whatever caused it.',
        },
      ],
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
    deploy: {
      title: 'Deploy adapter',
      lede: 'Deploying is permissionless and takes two arguments: the token and the feed. There is nothing to configure — the parameters below are fixed in the factory, and the address is fixed by the pair.',
      wrapsHeading: 'What this adapter wraps',
      token: 'Token',
      feed: 'Chainlink feed',
      address: 'Adapter address',
      addressPending: 'derived by the factory at deploy',
      paramsHeading: 'Baked into the adapter, read from the factory',
      paramsHeadingIntended: 'Baked into the adapter — the arguments it will be deployed with',
      answerHeading: 'What it would answer the moment it exists',
      answerPassthrough: 'passed through from the feed, nothing held',
      answerHeld: 'a held price — only the deployed adapter has it',
      acknowledge:
        'I understand the adapter is immutable and ownerless. Paying the gas gives me no rights over it, anyone may deploy the same pair, and the address is the same whoever sends the transaction.',
      mustAcknowledge: 'Confirm you understand what deploying means.',
      confirm: 'Deploy adapter',
      cancel: 'Cancel',
      copy: 'Copy',
      copied: 'Copied',
      gasNote:
        'One transaction, no approval and no value attached. Gas is paid in the chain’s native token.',
    },
    preview: {
      badge: 'Preview — no contract deployed',
      explain:
        'Every control is written against the final interface. Values marked "preview" are computed from the live feed by the adapter\u2019s own rules rather than read from a contract; when AdapterFactory is deployed, one address in lib/deployments.ts changes and the same screens read from chain instead.',
      mark: 'preview',
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
      factoryPending: 'issued at deploy',
      paramsIntended: 'the arguments it will be deployed with',
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
      budgetPreviewNote:
        'Full: the budget is only spent while a price is held, and no protection window is open on this feed.',
      budgetUnknown:
        'A protection window is open on this feed. The budget runs from the moment it opened, which only the adapter records.',
      answerLabel: 'What the adapter would answer',
      passthroughNote:
        'Nothing is held in this state: the adapter passes the feed\u2019s own number through, so this is the price it would return right now.',
      heldUnknown:
        'The held price is the one committed before this window opened. Only the adapter has it, and no adapter is deployed.',
      previewStatusNote:
        'Computed off chain by the adapter\u2019s own rules against the live feed, not read from a contract.',
      unmappedStatus:
        'This feed is past its heartbeat, and the on-chain enum has no member for that yet. Which state covers it is decided with the contract, so nothing is claimed here.',
      adapterPending: 'adapter address issued by the factory at deploy',
      noSnapshot: 'No snapshot committed yet. The first one is written when the adapter is deployed.',
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
      calculatorHeading: 'What this adapter is worth to you',
      calculatorLede:
        'The same position, valued three ways against this feed at the price above. Two of the three are wrong, and neither of them reverts — which is why the mistake survives an audit.',
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
  token: {
    // INTERIM — the one paragraph on this page that is an opinion rather than a
    // reading. Replace it with what the token actually does before launch.
    heading: 'Token',
    lede: 'Depth has not launched a token. When it does, its contract address will be published here and nowhere else.',

    address: {
      heading: 'Contract address',
      pending: 'Not deployed',
      pendingNote:
        'There is no Depth token on any chain today. Any address presented as one is a fraud, whoever sent it.',
      // The launch post lands before the site does: the address reaches this
      // page only through a commit and a deploy, which takes minutes. Saying
      // so is what stops the gap being used against a reader — an impostor
      // whose whole pitch is "the site has not updated yet" needs that gap to
      // be unexplained.
      announce: {
        before: 'The launch is announced first on X, from ',
        handle: '@DepthOracle_',
        href: 'https://x.com/DepthOracle_',
        after:
          ' and nowhere else. This page can trail that post by about ten minutes, because the address reaches it only through a commit and a deploy. An address missing here is never a reason to trust one you were sent.',
      },
      copy: 'Copy',
      copied: 'Copied',
      explorer: 'View on the explorer',
    },

    facts: {
      heading: 'Read from the contract',
      lede: 'Every field below is read from the token contract itself at the block shown — not typed into this page.',
      network: 'Network',
      symbol: 'Symbol',
      decimals: 'Decimals',
      supply: 'Total supply',
      launchedAt: 'Deployed at block',
      pending: '—',
      pendingNote: 'Appears the moment the contract exists.',
      unreadable:
        'The configured address did not answer as a token contract. Nothing is shown rather than something invented.',
    },

    verify: {
      heading: 'How to check you have the right address',
      points: [
        'Depth publishes the address in exactly two places: @DepthOracle_ on X, and this page. Here it is read from the chain, it carries the block it was deployed at, and it changes only by a commit to the public repository.',
        'We will never send you an address in a direct message, and we will never ask you to connect a wallet to claim anything.',
        'Before you trade, compare the address in your wallet against the one here, character by character — the first four and the last four are not enough.',
      ],
    },
  },

  footer: {
    columns: [
      {
        title: 'Product',
        links: [
          { label: 'The problem', href: '/#problem' },
          { label: 'How it works', href: '/#mechanism' },
          { label: 'Trust model', href: '/#limits' },
          { label: 'Token', href: '/token' },
          { label: 'Integration', href: '/docs' },
        ],
      },
      {
        title: 'Live',
        links: [
          { label: 'Feed status', href: '/board' },
          { label: 'Console', href: '/app' },
          { label: 'Calculator', href: '/app/calculator' },
        ],
      },
      {
        title: 'Reference',
        links: [
          { label: 'ERC-8056', href: 'https://eips.ethereum.org/EIPS/eip-8056', external: true },
          {
            label: 'Chainlink feeds',
            href: 'https://docs.chain.link/data-feeds/tokenized-equity-feeds/robinhood',
            external: true,
          },
          {
            label: 'Robinhood Chain docs',
            href: 'https://docs.robinhood.com/chain/stock-tokens/',
            external: true,
          },
        ],
      },
    ],
    rights: 'All rights reserved.',
    sourceNote: 'Every figure on this page is read from Robinhood Chain mainnet (chain 4663) at the time shown. Nothing is illustrative.',
  },
} as const
