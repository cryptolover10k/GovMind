import { useEffect, useState } from 'react'
import { getNetworkStats } from '../services/genlayerService'

export function Home({ onNavigate }) {
  const [networkStats, setNetworkStats] = useState([])

  useEffect(() => {
    async function loadNetworkStats() {
      const stats = await getNetworkStats()
      setNetworkStats(stats.slice(0, 3))
    }

    loadNetworkStats()
  }, [])

  return (
    <div className="flex flex-col gap-5 sm:gap-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-start">
        <div className="ai-panel rounded-2xl p-5 sm:p-7 md:p-10">
          <p className="ai-kicker">Agentic Economy on Arc</p>
          <div className="space-y-5">
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">
              Autonomous Agentic Treasury settled in USDC.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              GovMind uses Multi-Agent AI to autonomously research proposals, verify Arc Network treasury balances, and execute sub-second USDC payouts.
            </p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {['Autonomous Research', 'USDC Settlement', 'Zero-Human Ops'].map((label) => (
              <div key={label} className="ai-card rounded-xl px-4 py-3">
                <p className="text-xs font-semibold uppercase text-emerald-300">{label}</p>
                <div className="mt-3 h-1 rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-emerald-300" />
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3 sm:mt-6">
            <button
              type="button"
              onClick={() => onNavigate('submit')}
              className="ai-primary-button w-full rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110 sm:w-auto"
            >
              Submit Proposal
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="ai-secondary-button w-full rounded-full px-5 py-3 text-sm font-semibold transition hover:bg-cyan-300/20 sm:w-auto"
            >
              View Dashboard
            </button>
          </div>
        </div>

        <div className="ai-panel rounded-2xl p-5 sm:p-6">
          <div>
            <p className="ai-kicker text-emerald-300">Circle Developer Wallet</p>
            <div className="mt-4 flex justify-center">
              <div className="shield-active relative flex h-40 w-40 items-center justify-center rounded-[2rem] border border-cyan-300/20 bg-slate-950/60 shadow-[0_0_60px_rgba(34,211,238,0.16)] sm:h-48 sm:w-48">
                <div className="shield-ring absolute inset-4 rounded-[1.5rem] border border-emerald-300/10" />
                <div className="shield-status-dot absolute right-5 top-5 h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
                <img
                  src="/favicon.svg"
                  alt=""
                  className="shield-logo h-24 w-24 drop-shadow-[0_0_24px_rgba(34,211,238,0.38)] sm:h-32 sm:w-32"
                />
              </div>
            </div>
            <div className="mt-4 text-center">
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                Nanopayment Native Execution.
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
                The agent securely controls a Circle Developer Wallet to instantly execute sub-cent USDC nanopayments on Arc.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {networkStats.map((stat) => (
              <div key={stat.label} className="ai-card rounded-xl p-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-400">{stat.label}</span>
                  <span className="text-lg font-semibold text-white">{stat.value}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-emerald-300"
                    style={{ width: stat.level }}
                  />
                </div>
              </div>
            ))}
            {networkStats.length === 0 && (
              <p className="ai-card rounded-xl p-4 text-sm text-slate-300">
                Loading network data...
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="ai-panel rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Multi-Agent AI Brain</h2>
          <p className="text-sm leading-6 text-slate-400">
            A multi-agent consensus system (OpenAI + Anthropic) researches the applicant's history and ensures proposals meet the DAO's constitution.
          </p>
        </article>
        <article className="ai-panel rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Cross-Chain Verification</h2>
          <p className="text-sm leading-6 text-slate-400">
            The agent fetches live treasury balances via API to verify USDC liquidity before ever executing.
          </p>
        </article>
        <article className="ai-panel rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-white">Circle Nanopayments</h2>
          <p className="text-sm leading-6 text-slate-400">
            If approved, the agent orchestrates the payment via a Developer-Controlled Wallet using the Circle Nanopayments API.
          </p>
        </article>
      </section>
    </div>
  )
}
