import { registerEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets';
import 'dotenv/config';

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    console.error('Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env file.');
    process.exit(1);
  }

  if (entitySecret.length !== 64) {
    console.error('Error: CIRCLE_ENTITY_SECRET must be exactly 64 characters (32-byte hex).');
    process.exit(1);
  }

  console.log('Registering Entity Secret with Circle...');
  console.log('This will automatically encrypt your 64-character hex string into a 684-character Ciphertext and register it securely.');

  try {
    await registerEntitySecretCiphertext({
      apiKey,
      entitySecret,
      recoveryFileDownloadPath: '.',
    });

    console.log('\n✅ Successfully Registered Entity Secret!');
    console.log('✅ A recovery file has been downloaded to: ./recovery_file.dat');
    console.log('⚠️  Store this recovery file safely. Do NOT commit it to github.\n');
    console.log('You can now run: npm run create-wallet');
  } catch (err) {
    console.error('\n❌ Failed to register Entity Secret:');
    console.error(err?.response?.data || err.message);
  }
}

main();
