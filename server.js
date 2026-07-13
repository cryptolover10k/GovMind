import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import 'dotenv/config';
import crypto from 'crypto';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ethers } from 'ethers';
import { initiateUserControlledWalletsClient } from '@circle-fin/user-controlled-wallets';

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = './db.json';

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

async function getProposals() {
  try {
    const data = await fs.promises.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function saveProposals(proposals) {
  await fs.promises.writeFile(DB_FILE, JSON.stringify(proposals, null, 2));
}

async function addOrUpdateProposal(proposal) {
  const proposals = await getProposals();
  const index = proposals.findIndex(p => p.id === proposal.id);
  if (index !== -1) {
    proposals[index] = { ...proposals[index], ...proposal };
  } else {
    proposals.push(proposal);
  }
  await saveProposals(proposals);
}

// Initialize AI Clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Initialize Circle Client
const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
const walletId = process.env.CIRCLE_WALLET_ID;

let circleClient = null;
if (apiKey && entitySecret) {
  try {
    circleClient = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
    console.log('Circle Developer-Controlled Wallet client initialized.');
  } catch (err) {
    console.error('Failed to initialize Circle client:', err.message);
  }
}

// ABI for the Arc Testnet smart contract
const abi = [
  "event ProposalSubmitted(uint256 indexed id, address indexed creator, string title, string proposalText, string evidenceUrl, uint256 treasuryAmount, uint256 requestedFunding)"
];

const contractAddress = process.env.VITE_CONTRACT_ADDRESS;
const providerUrl = process.env.VITE_NETWORK_RPC_URL;

// Setup Ethers Provider & Wallet for Developer Backend Bypass (Lazy Initialization)
const arcProvider = new ethers.JsonRpcProvider(process.env.VITE_NETWORK_RPC_URL || 'https://rpc.testnet.arc.network');
const GovMindAbi = [
  "function submitProposalDelegated(address _creator, string memory _title, string memory _proposalText, string memory _evidenceUrl, uint256 _treasuryAmount, uint256 _requestedFunding) public returns (uint256)"
];

function getGovMindContract() {
  if (!process.env.DEPLOYER_PRIVATE_KEY) {
    throw new Error("DEPLOYER_PRIVATE_KEY is missing from environment variables");
  }
  const devWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, arcProvider);
  return new ethers.Contract(process.env.VITE_CONTRACT_ADDRESS, GovMindAbi, devWallet);
}

if (contractAddress && providerUrl) {
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const contract = new ethers.Contract(contractAddress, abi, provider);

  console.log(`Listening for ProposalSubmitted events on ${contractAddress}...`);
  
  const processedProposals = new Set();

  // Sync historical proposals on startup
  async function syncHistoricalProposals() {
    try {
      console.log('Syncing historical proposals from the blockchain...');
      const deploymentBlock = 51280148;
      const latestBlock = await provider.getBlockNumber();
      let allEvents = [];
      
      for (let i = deploymentBlock; i <= latestBlock; i += 9000) {
        const toBlock = Math.min(i + 8999, latestBlock);
        console.log(`Fetching blocks ${i} to ${toBlock}...`);
        const chunk = await contract.queryFilter("ProposalSubmitted", i, toBlock);
        allEvents = allEvents.concat(chunk);
      }

      console.log(`Found ${allEvents.length} historical proposals.`);
      for (const event of allEvents) {
        const [id, creator, title, proposalText, evidenceUrl, treasuryAmount, requestedFunding] = event.args;
        const proposalId = id.toString();
        
        if (!processedProposals.has(proposalId)) {
          processedProposals.add(proposalId);
          console.log(`Found historical proposal: ID ${proposalId}`);
          
          await addOrUpdateProposal({
            id: Number(proposalId),
            creator,
            title,
            proposal_text: proposalText,
            evidence_url: evidenceUrl,
            treasury_amount: (Number(treasuryAmount) / 1e6).toString(),
            requestedFunding: (Number(requestedFunding) / 1e6).toString(),
            status: 'SUBMITTED',
            timestamp: Date.now(),
            analysis: null
          });

          // Re-process to ensure payouts/AI runs if it hasn't been executed
          // We wrap in try-catch so it doesn't block sync
          try {
            await processProposal(proposalId, creator, title, proposalText, (Number(requestedFunding) / 1e6).toString());
          } catch (e) {
            console.error(`Historical process error for ${proposalId}:`, e);
          }
        }
      }
      console.log('Historical sync complete.');
    } catch (err) {
      console.error('Failed to sync historical proposals:', err);
    }
  }

  // Run the sync
  syncHistoricalProposals();

  contract.on("ProposalSubmitted", async (id, creator, title, proposalText, evidenceUrl, treasuryAmount, requestedFunding) => {
    const proposalId = id.toString();
    if (processedProposals.has(proposalId)) {
      console.log(`Proposal ${proposalId} already processed, skipping to prevent double-payout.`);
      return;
    }
    processedProposals.add(proposalId);

    console.log(`New proposal submitted: ID ${proposalId} by ${creator}`);
    
    // Save to DB initially
    await addOrUpdateProposal({
      id: Number(proposalId),
      creator,
      title,
      proposal_text: proposalText,
      evidence_url: evidenceUrl,
      treasury_amount: (Number(treasuryAmount) / 1e6).toString(),
      requestedFunding: (Number(requestedFunding) / 1e6).toString(),
      status: 'SUBMITTED',
      timestamp: Date.now(),
      analysis: null
    });

    try {
      await processProposal(proposalId, creator, title, proposalText, (Number(requestedFunding) / 1e6).toString());
    } catch (err) {
      console.error(`Error processing proposal ${proposalId}:`, err);
    }
  });
} else {
  console.warn('Missing VITE_CONTRACT_ADDRESS or VITE_NETWORK_RPC_URL. Not listening to blockchain events.');
}

async function getOpenAIPrompt(title, text) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a strict DAO governance AI. Respond with exactly one word: APPROVE or REJECT. Evaluate if the following proposal is safe for a USDC nanopayment." },
      { role: "user", content: `Title: ${title}\nText: ${text}` }
    ]
  });
  const content = completion.choices?.[0]?.message?.content;
  return content ? content.trim().toUpperCase() : "REJECT";
}

async function getAnthropicPrompt(title, text) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 10,
    system: "You are a strict DAO governance AI. Respond with exactly one word: APPROVE or REJECT. Evaluate if the following proposal is safe for a USDC nanopayment.",
    messages: [
      { role: "user", content: `Title: ${title}\nText: ${text}` }
    ]
  });
  const responseText = message.content?.[0]?.text;
  return responseText ? responseText.trim().toUpperCase() : "REJECT";
}

async function processProposal(id, creator, title, text, amount) {
  const proposalId = Number(id);
  const proposals = await getProposals();
  const existing = proposals.find(p => p.id === proposalId);
  
  // Prevent re-processing if already executed or rejected
  if (existing && existing.analysis) {
    console.log(`Proposal ${proposalId} has already been analyzed and executed. Skipping re-processing.`);
    return;
  }

  console.log(`Evaluating proposal ${id}...`);
  
  const [openaiResult, anthropicResult] = await Promise.all([
    getOpenAIPrompt(title, text).catch(() => "ERROR"),
    getAnthropicPrompt(title, text).catch(() => "ERROR")
  ]);

  console.log(`OpenAI: ${openaiResult} | Anthropic: ${anthropicResult}`);

  if (openaiResult.includes("APPROVE") && anthropicResult.includes("APPROVE")) {
    console.log("Multi-agent consensus reached: APPROVE. Executing payout...");
    const txId = await executePayout(creator, amount);
    
    await addOrUpdateProposal({
      id: proposalId,
      status: 'EXECUTED',
      analysis: {
        recommendation: 'APPROVE',
        execution_status: 'EXECUTED_USDC',
        target_chain: 'Arc Testnet',
        arc_tx_hash: txId || 'pending',
        openai: openaiResult,
        anthropic: anthropicResult,
        summary: `Both AI agents approved the proposal for a payout of ${amount} USDC.`,
        risk_score: 10
      }
    });
  } else {
    console.log("Proposal rejected by one or more agents.");
    await addOrUpdateProposal({
      id: proposalId,
      status: 'REJECTED',
      analysis: {
        recommendation: 'REJECT',
        execution_status: 'REJECTED',
        target_chain: 'Arc Testnet',
        openai: openaiResult,
        anthropic: anthropicResult,
        summary: `One or more agents rejected the proposal. Payout denied.`,
        risk_score: 85
      }
    });
  }
}

async function executePayout(destinationAddress, amount) {
  if (!circleClient || !walletId) {
    throw new Error('Circle client not initialized.');
  }

  const balancesResponse = await circleClient.getWalletTokenBalance({ id: walletId });
  const tokens = balancesResponse.data?.tokenBalances || [];
  const usdcToken = tokens.find(t => t.token.symbol === 'USDC');
  
  if (!usdcToken) {
    throw new Error('Wallet does not have USDC.');
  }
  
  const transferResponse = await circleClient.createTransaction({
    walletId: walletId,
    tokenId: usdcToken.token.id,
    destinationAddress: destinationAddress,
    amounts: [amount],
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    idempotencyKey: crypto.randomUUID(),
  });

  console.log(`Payout initiated. Tx ID: ${transferResponse.data?.id}`);
  return transferResponse.data?.id;
}

app.post('/api/analyze-proposal', async (req, res) => {
  try {
    const { title, text, walletAddress, requestedFunding } = req.body;
    console.log("Analyzing proposal:", title);
    
    const [openaiResult, anthropicResult] = await Promise.all([
      getOpenAIPrompt(title, text),
      getAnthropicPrompt(title, text)
    ]);
    res.json({ openai: openaiResult, anthropic: anthropicResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database Endpoints
app.get('/api/proposals', async (req, res) => {
  const proposals = await getProposals();
  res.json(proposals);
});

app.get('/api/proposals/:id', async (req, res) => {
  const proposals = await getProposals();
  const proposal = proposals.find(p => p.id === Number(req.params.id));
  if (!proposal) return res.status(404).json({ error: 'Not found' });
  res.json(proposal);
});

// ==========================================
// Circle User-Controlled Wallet Endpoints
// ==========================================

let userClient = null;
if (apiKey) {
  userClient = initiateUserControlledWalletsClient({ apiKey });
}

app.post('/api/circle/users/token', async (req, res) => {
  res.status(400).json({ error: 'Deprecated endpoint for Email OTP. Use /api/circle/users/login instead.' });
});

app.post('/api/circle/wallets/create', async (req, res) => {
  try {
    const { userToken, blockchains } = req.body;
    
    let response = await fetch('https://api.circle.com/v1/w3s/user/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CIRCLE_API_KEY}`,
        'X-User-Token': userToken,
      },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        accountType: 'SCA',
        blockchains: blockchains || ['ARC-TESTNET'],
      }),
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch(e) {
        return res.status(response.status).json({ error: "Failed to parse API response" });
      }
      
      // If the user is already initialized (code 155106), they just need a new wallet on this blockchain
      if (errorData.code === 155106 || (errorData.message && errorData.message.includes('already initialized'))) {
        console.log("User already initialized, adding a new wallet instead...");
        response = await fetch('https://api.circle.com/v1/w3s/user/wallets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CIRCLE_API_KEY}`,
            'X-User-Token': userToken,
          },
          body: JSON.stringify({
            idempotencyKey: crypto.randomUUID(),
            accountType: 'SCA',
            blockchains: blockchains || ['ARC-TESTNET'],
          }),
        });
        
        if (!response.ok) {
          const wErrorData = await response.json();
          return res.status(response.status).json(wErrorData);
        }
      } else {
        return res.status(response.status).json(errorData);
      }
    }
    
    const data = await response.json();
    return res.json({ challengeId: data.data?.challengeId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/circle/transactions/submit-proposal', async (req, res) => {
  try {
    const { userToken, walletId, title, description, requestedFunding } = req.body;
    
    // We want the user's wallet to execute the contract itself!
    const contractAddress = process.env.VITE_CONTRACT_ADDRESS;
    const requestedFundingFormatted = String(Math.floor(parseFloat(requestedFunding || 0) * 1e6));
    
    const payload = {
      userToken,
      walletId,
      contractAddress,
      abiFunctionSignature: "submitProposal(string,string,string,uint256,uint256)",
      abiParameters: [
        title || "",
        description || "",
        "",
        "0",
        requestedFundingFormatted
      ],
      fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
      idempotencyKey: crypto.randomUUID(),
    };

    console.log("Submit Proposal - Final Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.circle.com/v1/w3s/user/transactions/contractExecution', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
        'X-User-Token': userToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Submit Proposal - Circle API Response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create contract execution challenge');
    }

    res.json({ challengeId: data.data?.challengeId });
  } catch (error) {
    console.error('Submit proposal error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Transfer tokens (Used to quickly deploy an initialized wallet)
app.post('/api/circle/transactions/transfer', async (req, res) => {
  try {
    const { userToken, walletId, destinationAddress, amount } = req.body;
    
    // Fetch the wallet balances to get the dynamically generated User Token ID for ARC-TESTNET USDC
    const balRes = await fetch(`https://api.circle.com/v1/w3s/wallets/${walletId}/balances`, {
      headers: { 
        'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
        'X-User-Token': userToken
      }
    });
    const balData = await balRes.json();
    console.log("Transfer - RAW BALANCES DATA:", JSON.stringify(balData, null, 2));

    // Circle API throws a 'mismatch' if we use the Native Gas Token ID. We MUST explicitly find the ERC20 USDC.
    const token = balData?.data?.tokenBalances?.find(t => t.token.symbol === 'USDC' && t.token.isNative === false);
    const tokenId = token?.token?.id;

    if (!tokenId) {
      return res.status(400).json({ error: 'Could not find a valid ERC20 Token ID in your wallet to transfer. Please ensure you have requested funds from the Arc Faucet first!' });
    }

    const payload = {
      userToken,
      walletId,
      destinationAddress,
      amounts: [amount.toString()],
      fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
      tokenId: tokenId,
      idempotencyKey: crypto.randomUUID(),
    };

    const response = await userClient.createTransaction(payload);
    res.json({ challengeId: response.data.challengeId });
  } catch (err) {
    console.error("Transfer Challenge Error:", err?.response?.data || err.message);
    res.status(500).json({ error: err?.response?.data?.message || err?.response?.data || err.message });
  }
});

app.post('/api/circle/users/login', async (req, res) => {
  try {
    const { email, deviceId } = req.body;
    
    // Circle Email OTP Login requires email, deviceId, and idempotencyKey
    const response = await userClient.createDeviceTokenForEmailLogin({
      email,
      deviceId,
      idempotencyKey: crypto.randomUUID(),
    });
    
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/circle/wallets', async (req, res) => {
  try {
    const { userToken } = req.body;
    if (!userToken) {
      return res.status(400).json({ error: 'Missing userToken' });
    }

    const response = await fetch('https://api.circle.com/v1/w3s/wallets', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
        'X-User-Token': userToken,
      }
    });
    
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Express Backend running on http://localhost:${PORT}`);
});
