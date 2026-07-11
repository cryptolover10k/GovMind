import { Menu, X, ChevronDown, Send, Copy, LogOut } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'submit', label: 'Submit Proposal' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'details', label: 'Proposal Details' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'docs', label: 'Docs' },
]

export function AppLayout({
  activePage,
  children,
  onConnectWallet,
  onDisconnectWallet,
  onNavigate,
  onSendFunds,
  walletAddress,
  walletBalance,
  walletError,
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const shortAddress = formatAddress(walletAddress)
  
  // Truncate balance to 1 decimal place without rounding up
  // e.g. 30.4567 -> 30.4
  const numBalance = parseFloat(walletBalance)
  const displayBalance = !isNaN(numBalance) 
    ? (Math.floor(numBalance * 10) / 10).toFixed(1) 
    : '0.0'

  const handleNavigate = (page) => {
    onNavigate(page)
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="console-grid min-h-screen overflow-hidden text-slate-100">
      <header className="sticky top-0 z-20 border-b border-cyan-300/10 bg-slate-950/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={() => handleNavigate('home')}
            className="order-1 flex shrink-0 items-center gap-2 text-left text-lg font-semibold text-white"
          >
            <img
              src="/favicon.svg"
              alt=""
              className="h-8 w-8 rounded-xl border border-cyan-300/20 bg-slate-950/70 p-1"
            />
            <span>GovMind</span>
          </button>

          <nav
            aria-label="Primary navigation"
            className="order-3 hidden items-center gap-2 text-sm text-slate-300 md:order-2 md:flex md:w-auto"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`shrink-0 rounded-full border px-3 py-2 text-xs transition sm:px-4 sm:text-sm ${
                  activePage === item.id
                    ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
                    : 'border-slate-700/80 bg-slate-950/60 text-slate-300 hover:border-violet-300/50 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="order-2 flex max-w-[72%] items-center justify-end gap-2 md:order-3 md:max-w-none">
            {walletAddress ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-300/20 sm:px-4 sm:text-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                  {walletAddress === 'CONNECTED_WALLET' ? 'Connected Wallet' : shortAddress}
                  <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-cyan-300/20 bg-slate-950/95 p-2 shadow-xl backdrop-blur-xl">
                    <div className="mb-2 px-3 pb-2 pt-1 border-b border-slate-800/80">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Balance</p>
                      <p className="text-lg font-bold text-white mt-0.5">{displayBalance} <span className="text-sm text-cyan-400 font-medium">USDC</span></p>
                    </div>
                    <button
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-cyan-300/10 hover:text-white"
                      onClick={() => {
                        setIsDropdownOpen(false)
                        if (onSendFunds) onSendFunds()
                      }}
                    >
                      <Send size={14} /> Send
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-cyan-300/10 hover:text-white"
                      onClick={() => {
                        setIsDropdownOpen(false)
                        if (walletAddress !== 'CONNECTED_WALLET') {
                          navigator.clipboard.writeText(walletAddress)
                        }
                      }}
                    >
                      <Copy size={14} /> Copy Address
                    </button>
                    <div className="my-1 h-px w-full bg-slate-800"></div>
                    <button
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
                      onClick={() => {
                        setIsDropdownOpen(false)
                        onDisconnectWallet()
                      }}
                    >
                      <LogOut size={14} /> Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onConnectWallet}
                className="rounded-full border border-cyan-300/50 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)] transition hover:bg-cyan-300/20 sm:px-4 sm:text-sm"
              >
                Connect Wallet
              </button>
            )}
            <button
              type="button"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-cyan-100 transition hover:bg-cyan-300/20 md:hidden"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
          {walletError && (
            <p className="w-full text-xs text-amber-300 md:text-right">{walletError}</p>
          )}
          {isMobileMenuOpen && (
            <nav
              aria-label="Mobile navigation"
              className="order-5 grid w-full gap-2 rounded-2xl border border-cyan-300/15 bg-slate-950/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.35)] md:hidden"
            >
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    activePage === item.id
                      ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100'
                      : 'border-slate-700/80 bg-slate-950/70 text-slate-300 hover:border-violet-300/50 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5 md:py-12">{children}</main>
      {/* Footer removed per user request */}
    </div>
  )
}

function formatAddress(address) {
  if (!address) {
    return ''
  }

  if (address.includes('...')) {
    return address
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
