require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
    try {
        const addr = fs.readFileSync('wallet.txt', 'utf8').trim();
        if (addr && addr.length === 42) {
            const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
            const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
            const abi = ['function transfer(address,uint256) returns(bool)'];
            const token = new ethers.Contract('0x3600000000000000000000000000000000000000', abi, wallet);
            console.log('Sending 10 ERC20 USDC to', addr);
            const tx = await token.transfer(addr, ethers.parseUnits('10', 6));
            console.log('Sent 10 ERC20 USDC. TX:', tx.hash);
        } else {
            console.log('Wallet address not found or invalid in wallet.txt');
        }
    } catch (e) {
        console.error(e);
    }
}
main();
