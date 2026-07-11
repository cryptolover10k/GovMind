export const mockStats = [
  { label: 'Active proposals', value: '12', level: '72%' },
  { label: 'Average quorum', value: '68%', level: '68%' },
  { label: 'Treasury routed', value: '$2.4M', level: '81%' },
]

export const mockProposals = [
  {
    id: 'GOV-101',
    title: 'Launch Civic Research Grants',
    author: 'Nova Council',
    status: 'Voting',
    category: 'Funding',
    votesFor: 7840,
    votesAgainst: 1320,
    quorum: 72,
    treasury: '$480K',
    closesIn: '18h 24m',
    summary:
      'Create a quarterly grants pool for public goods research, local policy modeling, and governance tooling experiments.',
    impact:
      'Funds 16 teams across civic AI, voting UX, and transparent treasury analytics.',
  },
  {
    id: 'GOV-102',
    title: 'Upgrade Delegate Review Cadence',
    author: 'Signal Guild',
    status: 'Review',
    category: 'Operations',
    votesFor: 5120,
    votesAgainst: 870,
    quorum: 54,
    treasury: '$90K',
    closesIn: '2d 6h',
    summary:
      'Move delegate reviews to a monthly rhythm with public scorecards and review notes.',
    impact:
      'Improves accountability while giving contributors clearer feedback loops.',
  },
  {
    id: 'GOV-103',
    title: 'Fund Onchain Policy Simulations',
    author: 'Astra Labs',
    status: 'Queued',
    category: 'Research',
    votesFor: 3940,
    votesAgainst: 410,
    quorum: 41,
    treasury: '$320K',
    closesIn: '4d 12h',
    summary:
      'Prototype simulations for budget allocation, grant scoring, and dispute resolution scenarios.',
    impact:
      'Gives voters clearer forecasts before high-stakes governance decisions.',
  },
]

export const leaderboard = [
  { rank: 1, name: 'Nova Council', score: 9840, role: 'Delegate', streak: '21 votes' },
  { rank: 2, name: 'Astra Labs', score: 9310, role: 'Research Cell', streak: '14 reviews' },
  { rank: 3, name: 'Signal Guild', score: 8890, role: 'Operations', streak: '18 votes' },
  { rank: 4, name: 'Mira Chen', score: 8420, role: 'Treasury Analyst', streak: '9 reviews' },
  { rank: 5, name: 'Orbit Forum', score: 8010, role: 'Community', streak: '12 votes' },
]
