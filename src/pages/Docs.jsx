import React from 'react'

export function Docs() {
  return (
    <div className="grid gap-8">
      <section className="ai-panel rounded-2xl p-6 sm:p-8">
        <p className="ai-kicker text-violet-300">Documentation</p>
        <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Welcome to GovMind</h1>
        <p className="mt-4 text-lg text-slate-300">
          GovMind is an autonomous, decentralized grant proposal system built on the Arc Testnet. 
          It leverages Circle Programmable Wallets for secure payouts and Multi-Agent AI (OpenAI & Anthropic) for decentralized decision-making.
        </p>
      </section>

      <section className="ai-panel rounded-2xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-white mb-6">How to Use the App</h2>
        <div className="space-y-6 text-slate-300">
          <div className="ai-card p-5 rounded-xl">
            <h3 className="text-xl font-semibold text-cyan-200 mb-2">1. Connect Your Wallet</h3>
            <p>
              Click "Connect Wallet" in the top right corner. Enter your email address to generate a secure, non-custodial 
              <strong> Circle User-Controlled Wallet</strong>. Check your email for a PIN/OTP to authenticate. This wallet acts as your identity on the Arc Testnet.
            </p>
          </div>
          
          <div className="ai-card p-5 rounded-xl">
            <h3 className="text-xl font-semibold text-cyan-200 mb-2">2. Claim Free Testnet Tokens</h3>
            <p>
              Your wallet needs Arc Testnet tokens to pay for network gas fees. You can acquire free test tokens from the official 
              Arc Testnet faucet. Send them directly to your connected wallet address.
            </p>
          </div>

          <div className="ai-card p-5 rounded-xl">
            <h3 className="text-xl font-semibold text-cyan-200 mb-2">3. Submit a Proposal</h3>
            <p>
              Navigate to the <strong>Submit Proposal</strong> page. Fill out a detailed description of your public goods project and the amount of USDC you are requesting. 
              When you click submit, you will sign a smart contract transaction. This ensures you have "skin in the game" by paying network gas fees, preventing spam.
            </p>
          </div>

          <div className="ai-card p-5 rounded-xl">
            <h3 className="text-xl font-semibold text-cyan-200 mb-2">4. Multi-Agent AI Evaluation</h3>
            <p>
              Once your proposal is submitted to the blockchain, our backend instantly detects it and sends it to two independent AI agents 
              (OpenAI GPT-4o and Anthropic Claude 3.5). The agents evaluate the proposal for safety, viability, and public benefit.
            </p>
          </div>

          <div className="ai-card p-5 rounded-xl">
            <h3 className="text-xl font-semibold text-cyan-200 mb-2">5. Autonomous Payout</h3>
            <p>
              If <strong>both</strong> AI agents reach a consensus to approve your proposal, the backend automatically triggers our 
              <strong> Circle Developer-Controlled Wallet</strong> to send the requested USDC micro-grant directly to your wallet!
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="ai-panel rounded-2xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Architecture</h2>
          <ul className="space-y-4 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-1">✓</span>
              <div>
                <strong className="block text-white">Arc Testnet Smart Contract</strong>
                Acts as an immutable public ledger. Emits a Web3 event when a proposal is submitted, acting as an un-censorable trigger for the backend.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-1">✓</span>
              <div>
                <strong className="block text-white">Circle Web3 Services</strong>
                Provides smooth onboarding with email-based wallets for users, and powerful programmatic server-side wallets for the DAO treasury.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-emerald-400 mt-1">✓</span>
              <div>
                <strong className="block text-white">Node.js Backend</strong>
                Listens to the blockchain via ethers.js, coordinates the AI models, and securely signs programmatic payout transactions.
              </div>
            </li>
          </ul>
        </div>

        <div className="ai-panel rounded-2xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Security & Sybil Resistance</h2>
          <p className="text-sm leading-6 text-slate-300 mb-4">
            GovMind solves the classic DAO problem of proposal spam and malicious actors through two layers of defense:
          </p>
          <ul className="space-y-4 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 mt-1">🛡️</span>
              <div>
                <strong className="block text-white">Gas Cost Barrier</strong>
                Proposers must pay real testnet gas to submit. This economic friction makes automated spam attacks expensive and pointless.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400 mt-1">🤖</span>
              <div>
                <strong className="block text-white">Agent Consensus</strong>
                Relying on a single AI creates a central point of failure (prompt injection). GovMind requires 100% consensus between entirely different LLM architectures (OpenAI & Anthropic) to approve funds.
              </div>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
