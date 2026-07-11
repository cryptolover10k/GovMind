import { useState, useEffect } from 'react'
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk'
const inputStyle =
  'w-full rounded-xl border border-cyan-300/10 bg-slate-950/55 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20 sm:text-sm'

const initialForm = {
  title: '',
  description: '',
  evidenceUrl: '',
  treasuryAmount: '',
  requestedFunding: '',
}

export function SubmitProposal({ walletAddress, walletId, userToken, sdk }) {
  const [formData, setFormData] = useState(initialForm)
  const [analysis, setAnalysis] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [statusText, setStatusText] = useState('')

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setStatusText('Submitting proposal to Arc Testnet...')

    try {
      if (!walletAddress) {
        throw new Error('Please connect your Circle Wallet globally first.')
      }

      setStatusText('Generating smart contract transaction challenge...')
      const txRes = await fetch('https://govmind-gg3h.onrender.com/api/circle/transactions/submit-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userToken,
          walletId,
          walletAddress,
          title: formData.title, 
          description: formData.description,
          requestedFunding: formData.requestedFunding
        })
      })
      const txData = await txRes.json()
      
      if (!txRes.ok) throw new Error(txData.error || 'Failed to generate transaction challenge')

      setStatusText('Please confirm the transaction in the Circle popup to pay gas...')
      
      await new Promise((resolve, reject) => {
        sdk.execute(txData.challengeId, (error, result) => {
          if (error) {
            reject(new Error(error.message || 'Transaction was cancelled or failed'))
          } else {
            resolve(result)
          }
        })
      })

      setStatusText('Transaction submitted to Arc Testnet! Waiting for Multi-Agent AI Consensus...')
      
      const res = await fetch('https://govmind-gg3h.onrender.com/api/analyze-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: formData.title, 
          text: formData.description,
          walletAddress,
          requestedFunding: formData.requestedFunding
        })
      })
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      setAnalysis(data)
      setStatusText('Evaluation complete!')
    } catch (serviceError) {
      setError(serviceError.message)
      setStatusText('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="ai-panel rounded-2xl p-5 sm:p-7">
        <p className="ai-kicker text-violet-300">Centralized AI Agents</p>
        <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Multi-Agent Payout</h1>
        <p className="mt-3 text-lg text-slate-200 sm:text-xl">
          Submit a grant request to Arc Testnet using your Circle User-Controlled Wallet.
        </p>

        <div className="ai-card mt-6 rounded-xl p-4">
          <p className="text-sm font-semibold text-cyan-200">
            Circle Web3 Services
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {walletAddress ? 'Wallet Connected securely via Circle.' : 'Please connect your wallet globally to proceed.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <form onSubmit={handleSubmit} className="ai-panel rounded-2xl p-5 sm:p-6">
          <div className="grid gap-5">
            <label className="grid gap-2 text-sm text-slate-300">
              Proposal title
              <input className={inputStyle} value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Proposal description
              <textarea className={`${inputStyle} min-h-36 resize-y`} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              Requested funding (USDC)
              <input className={inputStyle} value={formData.requestedFunding} onChange={(e) => updateField('requestedFunding', e.target.value)} />
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isSubmitting} className="ai-primary-button w-full rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110 sm:w-auto">
                {isSubmitting ? 'Processing...' : 'Submit & Pay Gas'}
              </button>
            </div>
            {statusText && <p className="text-cyan-300 text-sm mt-2">{statusText}</p>}
            {error && <p className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
          </div>
        </form>

        {analysis && (
          <div className="ai-panel rounded-2xl p-5 sm:p-6 mt-4">
            <h3 className="text-xl font-bold text-white mb-4">Multi-Agent Results</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="ai-card p-4 rounded-xl border border-slate-700">
                <p className="text-sm text-slate-400">Agent 1</p>
                <p className="text-lg font-bold text-emerald-400">{analysis.openai}</p>
              </div>
              <div className="ai-card p-4 rounded-xl border border-slate-700">
                <p className="text-sm text-slate-400">Agent 2</p>
                <p className="text-lg font-bold text-emerald-400">{analysis.anthropic}</p>
              </div>
            </div>
            {(analysis.openai.includes('APPROVE') && analysis.anthropic.includes('APPROVE')) ? (
              <p className="mt-4 text-emerald-300 text-sm">Consensus Reached: Payout executing from Developer Wallet...</p>
            ) : (
              <p className="mt-4 text-rose-300 text-sm">Consensus Failed: Agents did not agree. Payout rejected.</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
