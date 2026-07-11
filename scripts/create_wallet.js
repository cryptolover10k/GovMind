import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import 'dotenv/config';

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    console.error('Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env file.');
    process.exit(1);
  }

  console.log('Initializing Circle SDK...');
  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  try {
    console.log('Creating a new Wallet Set...');
    const walletSetResponse = await client.createWalletSet({
      name: 'GovMind Developer Wallet Set',
    });

    const walletSetId = walletSetResponse.data?.walletSet?.id;
    if (!walletSetId) {
      throw new Error('Failed to get walletSetId from response.');
    }
    console.log(`✅ Created WalletSet. ID: ${walletSetId}`);

    console.log('Creating a new Developer-Controlled Wallet on ARC-TESTNET...');
    const walletsResponse = await client.createWallets({
      blockchains: ['ARC-TESTNET'],
      count: 1,
      walletSetId: walletSetId,
      idempotencyKey: crypto.randomUUID(), // Prevent duplicates
    });

    const wallet = walletsResponse.data?.wallets?.[0];
    if (!wallet) {
      throw new Error('Failed to create wallet.');
    }

    console.log(`✅ Created Developer Wallet.`);
    console.log(`\n==========================================`);
    console.log(`PLEASE ADD THE FOLLOWING TO YOUR .env FILE:`);
    console.log(`CIRCLE_WALLETSET_ID=${walletSetId}`);
    console.log(`CIRCLE_WALLET_ID=${wallet.id}`);
    console.log(`CIRCLE_WALLET_ADDRESS=${wallet.address}`);
    console.log(`==========================================\n`);
    
    console.log('Done!');
  } catch (err) {
    console.error('Error creating wallet:', err?.response?.data || err.message);
  }
}

main();
