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
            treasury_amount: treasuryAmount.toString(),
            requested_funding: requestedFunding.toString(),
            status: 'SUBMITTED',
            timestamp: Date.now(),
            analysis: null
          });

          // Re-process to ensure payouts/AI runs if it hasn't been executed
          // We wrap in try-catch so it doesn't block sync
          try {
            await processProposal(proposalId, creator, title, proposalText, requestedFunding.toString());
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
      treasury_amount: treasuryAmount.toString(),
      requested_funding: requestedFunding.toString(),
      status: 'SUBMITTED',
      timestamp: Date.now(),
      analysis: null
    });

    try {
      await processProposal(proposalId, creator, title, proposalText, requestedFunding.toString());
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
  const text = message.content?.[0]?.text;
  return text ? text.trim().toUpperCase() : "REJECT";
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
    
    const response = await fetch('https://api.circle.com/v1/w3s/user/initialize', {
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
    
    const data = await response.json();
    
    if (!response.ok) {
      if (data.code === 155106) {
        // User already initialized
        return res.json({ challengeId: null });
      }
      return res.status(response.status).json(data);
    }
    
    return res.json({ challengeId: data.data?.challengeId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/circle/transactions/submit-proposal', async (req, res) => {
  try {
    const { userToken, walletId, walletAddress, title, description, requestedFunding } = req.body;
    console.log("SUBMIT PROPOSAL REQ:", { walletId, walletAddress, title, description, requestedFunding });

    // We use the configured contract address for Arc Testnet
    try {
      const balRes = await fetch(`https://api.circle.com/v1/w3s/wallets/${walletId}/balances`, {
        headers: { 
          'Authorization': `Bearer ${process.env.CIRCLE_API_KEY}`,
          'X-User-Token': userToken
        }
      });
      const balData = await balRes.json();
      console.log("ACTUAL USER BALANCES VIA USER TOKEN:", JSON.stringify(balData));
    } catch(e) {}

    // Since the user wants to pay gas natively, we use contract execution challenge.
    // By providing fee: { type: 'gas' } without config, Circle will auto-estimate
    // the gas limits and fees using the network's current conditions.
    const response = await userClient.createUserTransactionContractExecutionChallenge({
      userToken,
      walletId,
      contractAddress: process.env.VITE_CONTRACT_ADDRESS,
      abiFunctionSignature: "submitProposal(string,string,string,uint256,uint256)",
      abiParameters: [
        title || "",
        description || "",
        "", // evidenceUrl
        "0", // treasuryAmount
        String(requestedFunding || 0)
      ],
      fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
      idempotencyKey: crypto.randomUUID(),
    });

    res.json({ challengeId: response.data.challengeId });
  } catch (err) {
    console.error("Contract Execution Challenge Error:", err?.response?.data || err.message);
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
app.listen(PORT, () => {
  console.log(`Express Backend running on http://localhost:${PORT}`);
});
