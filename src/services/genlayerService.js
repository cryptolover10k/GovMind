// Fetch all proposals from the backend
export async function getAllProposals() {
  try {
    const res = await fetch('https://govmind-gg3h.onrender.com/api/proposals');
    if (!res.ok) throw new Error('Failed to fetch proposals');
    return await res.json();
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }
}

// Fetch a single proposal
export async function getProposal(proposalId) {
  try {
    const res = await fetch(`https://govmind-gg3h.onrender.com/api/proposals/${proposalId}`);
    if (!res.ok) throw new Error('Proposal not found');
    return await res.json();
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return { error: 'PROPOSAL_NOT_FOUND' };
  }
}

// Submit proposal just returns the mock for now as it's not currently called to save
// Instead, SubmitProposal.jsx directly posts to /api/analyze-proposal and handles the flow.
export async function submitProposal(proposalData) {
  return null;
}

export async function analyzeProposal(proposalId, walletAddress) {
  return null;
}

// Calculate the leaderboard dynamically based on actual executed proposals
export async function getLeaderboard() {
  const proposals = await getAllProposals();
  
  // Group executed proposals by creator
  const stats = {};
  for (const p of proposals) {
    if (p.status === 'EXECUTED' || p.status === 'SUBMITTED' || p.status === 'REJECTED') {
      const address = p.creator || '0xUnknown';
      if (!stats[address]) {
        stats[address] = { count: 0, executed: 0 };
      }
      stats[address].count += 1;
      if (p.status === 'EXECUTED') {
        stats[address].executed += 1;
      }
    }
  }

  // Convert to leaderboard array
  const leaderboard = Object.keys(stats).map(address => ({
    address,
    name: `User ${address.substring(0, 6)}...`,
    role: 'DAO Contributor',
    score: stats[address].executed * 100 + stats[address].count * 10,
    streak: `${stats[address].executed} Approvals`,
  })).sort((a, b) => b.score - a.score);

  // Add rank
  return leaderboard.map((user, index) => ({
    ...user,
    rank: index + 1
  }));
}

export async function getUserReputation(address) {
  const leaderboard = await getLeaderboard();
  const user = leaderboard.find(u => u.address.toLowerCase() === address.toLowerCase());
  return {
    address,
    reputation: user ? user.score : 0,
  };
}

// Dynamically calculate network stats based on actual proposals
export async function getNetworkStats() {
  const proposals = await getAllProposals();
  const leaderboard = await getLeaderboard();

  const analyzedCount = proposals.filter((p) => p.analysis).length;
  const pendingCount = proposals.length - analyzedCount;
  const contributors = new Set(proposals.map(p => p.creator).filter(Boolean));

  function percentageLevel(value, max) {
    if (max === 0) return '0%';
    return `${Math.min(100, Math.round((value / max) * 100))}%`;
  }

  return [
    {
      label: 'Active proposals',
      value: String(proposals.length),
      level: percentageLevel(proposals.length, 10),
    },
    {
      label: 'Analyzed proposals',
      value: String(analyzedCount),
      level: proposals.length === 0 ? '0%' : `${Math.round((analyzedCount / proposals.length) * 100)}%`,
    },
    {
      label: 'DAO contributors',
      value: String(contributors.size),
      level: percentageLevel(contributors.size, 10),
    },
    {
      label: 'Pending analysis',
      value: String(pendingCount),
      level: proposals.length === 0 ? '0%' : `${Math.round((pendingCount / proposals.length) * 100)}%`,
    },
  ];
}
