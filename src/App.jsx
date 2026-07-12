import { useState, useEffect, useRef } from 'react'
import { AppLayout } from './components/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Home } from './pages/Home'
import { Leaderboard } from './pages/Leaderboard'
import { ProposalDetails } from './pages/ProposalDetails'
import { SubmitProposal } from './pages/SubmitProposal'
import { Docs } from './pages/Docs'
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk'

const sdk = new W3SSdk()
sdk.setAppSettings({ appId: import.meta.env.VITE_CIRCLE_APP_ID })

function App() {
  const [activePage, setActivePage] = useState('home')
  const [activeProposalId, setActiveProposalId] = useState(1)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletId, setWalletId] = useState('')
  const [walletBalance, setWalletBalance] = useState('0') // Start at 0
  const [walletError, setWalletError] = useState('')

  // Email Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalStep, setModalStep] = useState('EMAIL') // 'EMAIL' or 'OTP'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Send Modal State
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [sendRecipient, setSendRecipient] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendStatus, setSendStatus] = useState('')
  
  // Temp variables during login
  const [deviceToken, setDeviceToken] = useState('')
  const [deviceEncryptionKey, setDeviceEncryptionKey] = useState('')

  // Circle SDK State
  const sdkRef = useRef(null)
  const [deviceId, setDeviceId] = useState('')
  const [userToken, setUserToken] = useState('')

  useEffect(() => {
    let cancelled = false;

    const initSdk = () => {
      try {
        const sdkInstance = new W3SSdk();

        // setAppSettings does NOT take a callback in this version.
        sdkInstance.setAppSettings({ appId: import.meta.env.VITE_CIRCLE_APP_ID });
        sdkRef.current = sdkInstance;

        // Restore session if exists
        const savedToken = localStorage.getItem('circle_user_token');
        const savedKey = localStorage.getItem('circle_encryption_key');
        if (savedToken && savedKey) {
          setUserToken(savedToken);
          sdkInstance.setAuthentication({
            userToken: savedToken,
            encryptionKey: savedKey
          });
          fetchWalletData(savedToken);
        }

        // Fetch Device ID
        sdkInstance.getDeviceId()
          .then(id => {
            if (!cancelled) {
              setDeviceId(id);
            }
          })
          .catch(err => {
            console.error('Failed to get device ID:', err);
          });
      } catch (err) {
        console.error('Failed to init SDK:', err);
      }
    };

    initSdk();
    return () => { cancelled = true; };
  }, []);

  const fetchWalletData = async (token) => {
    try {
      const res = await fetch('https://govmind-gg3h.onrender.com/api/circle/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken: token })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch wallet');
      
      const wallets = data.data?.wallets || [];
      if (wallets.length > 0) {
        const address = wallets[0].address;
        const id = wallets[0].id;
        setWalletAddress(address);
        setWalletId(id);
        
        try {
          // Arc Network uses USDC as its native gas token, so we fetch the native ETH balance
          const arcRpcUrl = import.meta.env.VITE_NETWORK_RPC_URL || 'https://rpc.testnet.arc.network';
          const rpcRes = await fetch(arcRpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_getBalance",
              params: [address, "latest"],
              id: 1
            })
          });
          const rpcData = await rpcRes.json();
          if (rpcData.result) {
            const balanceInWei = BigInt(rpcData.result);
            const balanceInNative = Number(balanceInWei) / 1e18;
            // Format to 1 decimal place (e.g. 30.4567 -> 30.4)
            const formatted = (Math.floor(balanceInNative * 10) / 10).toString();
            setWalletBalance(formatted);
          }
        } catch (rpcErr) {
          console.error("Failed to fetch Arc Network balance:", rpcErr);
        }
      } else {
        // No wallet found - initiate creation challenge
        console.log("No wallet found, initiating creation challenge...");
        const createRes = await fetch('https://govmind-gg3h.onrender.com/api/circle/wallets/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userToken: token })
        });
        const createData = await createRes.json();
        
        if (!createRes.ok) throw new Error(createData.error?.message || createData.error || 'Failed to initialize wallet creation');
        
        if (createData.challengeId && sdkRef.current) {
          sdkRef.current.execute(createData.challengeId, (error, result) => {
            if (error) {
              setWalletError(error.message || 'Failed to complete wallet setup challenge');
            } else {
              console.log("Wallet setup complete!", result);
              // Fetch the newly created wallet
              fetchWalletData(token);
            }
          });
        } else {
          // If no challengeId is needed (e.g., already initialized SCA), wait a few seconds and fetch again as the wallet is created in the background
          console.log("No challenge required, polling for wallet creation...");
          setTimeout(() => fetchWalletData(token), 3000);
        }
      }
    } catch (err) {
      console.error('Wallet fetch error:', err);
      setWalletError('Failed to fetch wallet details: ' + err.message);
    }
  };

  const navigate = (page, proposalId) => {
    if (proposalId) {
      setActiveProposalId(proposalId)
    }
    setActivePage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pages = {
    home: <Home onNavigate={navigate} />,
    submit: <SubmitProposal 
      walletAddress={walletAddress} 
      walletId={walletId} 
      userToken={userToken} 
      sdk={sdkRef.current} 
    />,
    dashboard: <Dashboard onNavigate={navigate} />,
    details: (
      <ProposalDetails
        proposalId={activeProposalId}
        onNavigate={navigate}
        onSelectProposal={setActiveProposalId}
      />
    ),
    leaderboard: <Leaderboard />,
    docs: <Docs />,
  }

  const connectWallet = () => {
    setWalletError('')
    setIsModalOpen(true)
    setModalStep('EMAIL')
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setWalletError('')

    try {
      if (!deviceId) throw new Error("Device ID not ready. Please wait.");
      
      // Request OTP
      const res = await fetch('https://govmind-gg3h.onrender.com/api/circle/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, deviceId })
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to initiate login')

      const sdk = sdkRef.current;
      if (!sdk) throw new Error("SDK not initialized");

      // Configure SDK with session data and pass the onLoginComplete callback!
      sdk.updateConfigs({
        appSettings: { appId: import.meta.env.VITE_CIRCLE_APP_ID },
        loginConfigs: {
          deviceToken: data.deviceToken,
          deviceEncryptionKey: data.deviceEncryptionKey,
          otpToken: data.otpToken,
        },
      }, (error, result) => {
        if (error) {
          console.error('Circle Login Failed:', error);
          setWalletError(error.message || 'Login failed');
          setIsLoading(false);
          return;
        }

        console.log('Circle Login Success:', result);
        if (result && result.userToken) {
          setUserToken(result.userToken);
          // Required: Authenticate the SDK instance so it can execute challenges!
          sdk.setAuthentication({
            userToken: result.userToken,
            encryptionKey: result.encryptionKey
          });
          
          // Persist session
          localStorage.setItem('circle_user_token', result.userToken);
          localStorage.setItem('circle_encryption_key', result.encryptionKey);
          
          fetchWalletData(result.userToken);
        }
        setIsModalOpen(false);
        setIsLoading(false);
      });

      // Pop up the Circle hosted UI
      sdk.verifyOtp();
      
    } catch (err) {
      setWalletError(err.message)
      setIsLoading(false)
    }
  }

  const handleSendTransaction = async (e) => {
    e.preventDefault()
    setIsSending(true)
    setSendStatus('Initiating transfer...')
    try {
      if (!walletId || !userToken) throw new Error("Wallet not fully connected.");
      
      const res = await fetch('https://govmind-gg3h.onrender.com/api/circle/transactions/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userToken,
          walletId,
          destinationAddress: sendRecipient,
          amount: sendAmount
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate transfer");

      setSendStatus('Please confirm the transfer challenge in the popup...')
      
      await new Promise((resolve, reject) => {
        sdkRef.current.execute(data.challengeId, (error, result) => {
          if (error) reject(new Error(error.message || 'Transaction was cancelled or failed'));
          else resolve(result);
        });
      });
      
      setSendStatus('Transfer successful!')
      
      setTimeout(() => {
        setIsSendModalOpen(false)
        setSendRecipient('')
        setSendAmount('')
        setSendStatus('')
        fetchWalletData(userToken)
      }, 2000)
    } catch (err) {
      setSendStatus('Transfer failed: ' + err.message)
    } finally {
      setIsSending(false)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress('')
    setWalletId('')
    setWalletBalance('0')
    setUserToken('')
    setWalletError('')
    localStorage.removeItem('circle_user_token')
    localStorage.removeItem('circle_encryption_key')
    window.location.reload()
  }

  return (
    <>
      <AppLayout
        activePage={activePage}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        onNavigate={navigate}
        onSendFunds={() => setIsSendModalOpen(true)}
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        walletError={walletError}
      >
        {pages[activePage]}
      </AppLayout>

      {/* Email Login Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-all duration-300">
          <div className="bg-slate-900/90 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-[0_0_40px_rgba(59,130,246,0.15)] relative overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Connect Wallet</h2>
              <p className="text-slate-400 text-sm">Sign in with your email to access your user-controlled wallet on the ARC-TESTNET.</p>
            </div>

            {walletError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm break-words animate-in slide-in-from-top-2">
                {walletError}
              </div>
            )}

            <form onSubmit={handleEmailSubmit}>
              <div className="mb-6">
                <label className="block text-slate-300 text-sm font-medium mb-3">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner placeholder:text-slate-600"
                  placeholder="Enter your email"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Opening Secure UI...
                  </>
                ) : 'Continue with Email'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Send Funds Modal */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-all duration-300">
          <div className="bg-slate-900/90 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-[0_0_40px_rgba(59,130,246,0.15)] relative overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
            <button 
              onClick={() => setIsSendModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Send USDC</h2>
              <p className="text-slate-400 text-sm">Transfer USDC from your user-controlled wallet.</p>
            </div>

            <form onSubmit={handleSendTransaction}>
              <div className="mb-5">
                <label className="block text-slate-300 text-sm font-medium mb-3">Recipient Address</label>
                <input
                  type="text"
                  value={sendRecipient}
                  onChange={e => setSendRecipient(e.target.value)}
                  required
                  disabled={isSending}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner placeholder:text-slate-600 font-mono text-sm"
                  placeholder="0x..."
                />
              </div>
              <div className="mb-8">
                <label className="block text-slate-300 text-sm font-medium mb-3">Amount (USDC)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.000001"
                    value={sendAmount}
                    onChange={e => setSendAmount(e.target.value)}
                    required
                    disabled={isSending}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner placeholder:text-slate-600 pl-14"
                    placeholder="0.00"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-50">
                    <span className="text-white font-medium">$</span>
                  </div>
                </div>
              </div>
              
              {sendStatus && (
                <div className={`mb-6 p-4 rounded-2xl text-sm animate-in slide-in-from-top-2 ${sendStatus.includes('failed') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                  <div className="flex items-center gap-2">
                    {sendStatus.includes('failed') ? (
                      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : sendStatus.includes('successful') ? (
                      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="animate-spin h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {sendStatus}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2"
              >
                {isSending ? 'Processing...' : 'Send Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default App
