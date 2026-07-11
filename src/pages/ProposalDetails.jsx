import { useEffect, useState } from 'react'
import { getAllProposals, getProposal } from '../services/genlayerService'

export function ProposalDetails({ proposalId, onNavigate, onSelectProposal }) {
  const [proposal, setProposal] = useState(null)
  const [proposals, setProposals] = useState([])

  useEffect(() => {
    async function loadProposalDetails() {
      const [serviceProposal, serviceProposals] = await Promise.all([
        getProposal(proposalId),
        getAllProposals(),
      ])

      const fallbackProposal = serviceProposals[0] ?? null

      setProposal(serviceProposal?.error ? fallbackProposal : serviceProposal)
      setProposals(serviceProposals)
    }

    loadProposalDetails()
  }, [proposalId])

  if (!proposal) {
    return (
      <section className="ai-panel rounded-2xl p-5 sm:p-7">
        <h1 className="text-3xl font-semibold text-white md:text-4xl">Proposal Details</h1>
        <p className="mt-4 text-sm text-slate-300">No proposals found yet. Please wait for the blockchain to process your submission...</p>
      </section>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="ai-panel rounded-2xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="ai-kicker">
            Proposal #{proposal.id}
          </p>
          <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">
            {proposal.status}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Proposal Details</h1>
        <h2 className="mt-3 break-words text-xl font-semibold text-slate-100 sm:text-2xl">
          {proposal.title}
        </h2>
        <p className="mt-3 break-words text-sm text-slate-400">Submitted by {proposal.creator}</p>
        <p className="mt-6 break-words text-sm leading-7 text-slate-300 sm:text-base">
          {proposal.proposal_text}
        </p>
        <div className="ai-card mt-6 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white">AI Summary</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {proposal.analysis?.summary ?? 'This proposal has not been analyzed yet.'}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric label="Execution Status" value={proposal.analysis?.execution_status ?? 'PENDING'} />
          <Metric label="Payout Chain" value={proposal.analysis?.target_chain ?? 'Arc Network'} />
          <Metric label="Risk Score" value={`${proposal.analysis?.risk_score ?? 0}%`} />
        </div>

        {proposal.analysis?.arc_tx_hash && (
          <div className="mt-6 rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-4">
            <p className="text-sm font-semibold text-cyan-200">Circle Nanopayment Receipt</p>
            <p className="mt-2 text-xs text-slate-300 break-all font-mono">
              API TxID: {proposal.analysis.arc_tx_hash}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Agent successfully dispatched USDC nanopayment via Circle Developer Wallet on Arc.
            </p>
          </div>
        )}
      </section>

      <aside className="ai-panel rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-white">Proposal Switcher</h2>
        <div className="mt-4 grid gap-3">
          {proposals.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectProposal(item.id)
                onNavigate('details', item.id)
              }}
              className={`rounded-xl border p-3 text-left text-sm transition ${
                item.id === proposal.id
                  ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100'
                  : 'border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/50'
              }`}
            >
              <span className="block text-xs text-slate-400">Proposal #{item.id}</span>
              {item.title}
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="ai-card rounded-xl p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-white sm:text-2xl">{value}</p>
    </div>
  )
}
