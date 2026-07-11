import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import solc from 'solc';
import 'dotenv/config';

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Please set DEPLOYER_PRIVATE_KEY in your .env file.');
  }

  const rpcUrl = process.env.VITE_NETWORK_RPC_URL || 'https://rpc.testnet.arc.network';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`Deploying from account: ${wallet.address}`);

  const contractPath = path.resolve('contracts', 'GovMindStorage.sol');
  const sourceCode = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'GovMindStorage.sol': {
        content: sourceCode,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*'],
        },
      },
    },
  };

  console.log('Compiling contract...');
  const compiledCode = JSON.parse(solc.compile(JSON.stringify(input)));

  if (compiledCode.errors) {
    const isError = compiledCode.errors.some(err => err.severity === 'error');
    if (isError) {
      console.error('Compilation Errors:', compiledCode.errors);
      process.exit(1);
    } else {
      console.warn('Compilation Warnings:', compiledCode.errors);
    }
  }

  const contractFile = compiledCode.contracts['GovMindStorage.sol']['GovMindProposals'];
  const bytecode = contractFile.evm.bytecode.object;
  const abi = contractFile.abi;

  console.log('Deploying contract to Arc Testnet...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`Contract deployed successfully at address: ${address}`);

  // Automatically update the .env file with the new address
  const envPath = path.resolve('.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(/VITE_CONTRACT_ADDRESS=.*/g, `VITE_CONTRACT_ADDRESS=${address}`);
  fs.writeFileSync(envPath, envContent);
  console.log(`Updated .env with VITE_CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
