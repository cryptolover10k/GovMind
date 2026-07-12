# GovMind: Autonomous AI DAO Treasury

GovMind is a fully functional, decentralized grant proposal system built on the **Arc Testnet**. It demonstrates a revolutionary "Agentic Economy" where AI agents independently evaluate public goods proposals and autonomously execute stablecoin payouts without human intervention.

## 🚀 Key Features

*   **Circle User-Controlled Wallets**: Frictionless onboarding. Users authenticate via an Email OTP to generate a non-custodial Smart Contract Wallet (SCA).
*   **Arc Testnet Smart Contracts**: Proposals are submitted directly to the blockchain, requiring users to pay native gas. This provides an immutable record and economic friction against spam.
*   **Multi-Agent Consensus**: Dual AI evaluation using **OpenAI (GPT-4o)** and **Anthropic (Claude 3.5)**. Both models must independently agree to approve a proposal to prevent prompt injection attacks.
*   **Circle Developer-Controlled Wallets**: If consensus is reached, the backend securely signs a programmatic transaction using the DAO's treasury wallet to execute a USDC micro-grant payout.

## 🏗️ Architecture

1.  **Frontend (React + Vite + TailwindCSS)**: Handles user onboarding via Circle Web3 Services SDK and provides the UI for submitting proposals.
2.  **Smart Contract (Solidity)**: Hosted on the Arc Testnet. Emits `ProposalSubmitted` events that act as un-censorable triggers.
3.  **Backend (Node.js + Express)**: Listens to the blockchain via `ethers.js`. Coordinates the OpenAI and Anthropic API calls. Interacts with the Circle Developer API to process treasury payouts.

## 🛠️ Tech Stack

*   **Frontend**: React, Vite, Tailwind CSS, Lucide React
*   **Backend**: Node.js, Express, Ethers.js (v6)
*   **Web3 Infrastructure**: Arc Testnet, Solidity
*   **Wallet Services**: Circle Web3 Programmable Wallets (User-Controlled & Developer-Controlled)
*   **AI Models**: OpenAI SDK (GPT-4o), Anthropic SDK (Claude 3.5 Sonnet)

## ⚙️ Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your keys:

```env
# Circle Web3 Services
VITE_CIRCLE_APP_ID="your_circle_app_id"
CIRCLE_API_KEY="your_circle_api_key"
CIRCLE_ENTITY_SECRET="your_entity_secret_ciphertext"
CIRCLE_WALLET_ID="your_treasury_wallet_id"

# AI Agents
OPENAI_API_KEY="your_openai_key"
ANTHROPIC_API_KEY="your_anthropic_key"

# Blockchain Configuration
VITE_CONTRACT_ADDRESS="0x0F390DAd222775B52592D68464813D64211b39D8"
VITE_NETWORK_RPC_URL="https://rpc.testnet.arc.network"
DEPLOYER_PRIVATE_KEY="your_deployer_private_key"
```

### 3. Run the Application
The project uses `concurrently` to run both the Vite frontend and Express backend simultaneously.

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:3000`.

## 📜 How It Works (End-to-End Flow)

1.  A user connects their wallet via Email authentication.
2.  The user fills out the proposal form and signs a transaction to the Arc Testnet using their Circle wallet.
3.  The `GovMindStorage` smart contract permanently logs the proposal and emits a `ProposalSubmitted` event.
4.  The Node.js backend detects the event on the Arc Testnet.
5.  The backend passes the proposal text to OpenAI and Anthropic.
6.  If both AIs return `APPROVE`, the backend triggers the Circle Developer Wallet to transfer USDC to the user.
7.  The execution result is logged and displayed on the frontend Dashboard.

## 🔒 Security & Sybil Resistance
*   **Gas Cost Barrier**: Proposers must pay real testnet gas to submit. This economic friction makes automated spam attacks expensive.
*   **Agent Consensus**: Relying on a single AI creates a central point of failure. GovMind requires 100% consensus between entirely different LLM architectures to approve funds.
