import { useEffect, useState } from 'react'
import { getAllProposals, getNetworkStats } from '../services/genlayerService'

export function Dashboard({ onNavigate }) {
  const [proposals, setProposals] = useState([])
  const [networkStats, setNetworkStats] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProposals() {
      const [serviceProposals, serviceStats] = await Promise.all([
        getAllProposals(),
        getNetworkStats(),
      ])
      setProposals(serviceProposals)
      setNetworkStats(serviceStats.slice(0, 3))
      setIsLoading(false)
    }

    loadProposals()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <section className="ai-panel rounded-2xl p-5 sm:p-7">
        <p className="ai-kicker">Circle Nanopayments execution log</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
          Agentic Economy Dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Track autonomous proposal throughput and successful USDC payout executions settled on the Arc Network.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {networkStats.map((stat) => (
          <article
            key={stat.label}
            className="ai-panel rounded-2xl p-4 sm:p-5"
          >
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
            <div className="mt-5 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                style={{ width: stat.level }}
              />
            </div>
          </article>
        ))}
        {networkStats.length === 0 && (
          <article className="ai-panel rounded-2xl p-5 text-sm text-slate-300">
            Loading network stats...
          </article>
        )}
      </section>

      <section className="ai-panel rounded-2xl p-4 sm:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Execution Queue</h2>
          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            Multi-Agent service data
          </span>
        </div>

        <div className="grid gap-3">
          {isLoading && (
            <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
              Loading proposals...
            </p>
          )}

          {!isLoading &&
            proposals.map((proposal) => (
              <button
                key={proposal.id}
                type="button"
                onClick={() => onNavigate('details', proposal.id)}
                className="ai-card grid gap-3 rounded-xl p-4 text-left transition hover:border-cyan-300/50 md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="text-xs text-cyan-300">Proposal #{proposal.id}</p>
                  <h3 className="mt-2 break-words font-semibold text-white">{proposal.title}</h3>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-400">
                    {proposal.proposal_text}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <span className="rounded-full bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-200">
                    {proposal.status}
                  </span>
                  <span className="text-sm text-slate-300">
                    {proposal.analysis ? proposal.analysis.execution_status || 'EXECUTED_USDC' : 'Pending AI decision'}
                  </span>
                </div>
              </button>
            ))}
        </div>
      </section>
    </div>
  )
}
