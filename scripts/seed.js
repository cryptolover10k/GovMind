import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import 'dotenv/config';

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Please set DEPLOYER_PRIVATE_KEY in your .env file.');
  }

  const rpcUrl = process.env.VITE_NETWORK_RPC_URL || 'https://rpc.testnet.arc.network';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const contractAddress = process.env.VITE_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error('VITE_CONTRACT_ADDRESS is missing.');
  }

  const abi = [
    "function submitProposal(string _title, string _proposalText, string _evidenceUrl, uint256 _treasuryAmount, uint256 _requestedFunding) public returns (uint256)"
  ];

  const contract = new ethers.Contract(contractAddress, abi, wallet);

  console.log(`Submitting a seed proposal to contract ${contractAddress}...`);
  
  const tx = await contract.submitProposal(
    "Open-Source Public Goods Infrastructure Grant",
    "This proposal requests a micro-grant of 2 USDC to fund the deployment and hosting of open-source decentralized public goods infrastructure on the Arc Testnet.",
    "https://github.com/govmind",
    0,
    2
  );

  console.log(`Transaction submitted! Hash: ${tx.hash}`);
  console.log('Waiting for confirmation...');
  await tx.wait();
  
  console.log('Seed proposal successfully submitted to the blockchain!');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
