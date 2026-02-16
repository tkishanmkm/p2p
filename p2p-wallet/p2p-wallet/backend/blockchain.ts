import dotenv from 'dotenv';
dotenv.config();

import { ethers, HDNodeWallet } from 'ethers';
import TronWeb from 'tronweb';

// --- CONFIGURATION ---
const seedPhrase = process.env.ADMIN_MASTER_SEED;
const INFURA_KEY = process.env.INFURA_API_KEY;
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY;
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL;
const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL;
const BASE_RPC_URL = process.env.BASE_RPC_URL;


if (!seedPhrase) {
    console.warn("CRITICAL: ADMIN_MASTER_SEED environment variable not set. On-chain operations will fail.");
}

// --- PROVIDERS SETUP ---
export const ethProvider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_KEY}`);
export const bscProvider = new ethers.JsonRpcProvider(BSC_RPC_URL);
export const polygonProvider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
export const arbitrumProvider = new ethers.JsonRpcProvider(ARBITRUM_RPC_URL);
export const baseProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);

export const tron = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { "TRON-PRO-API-KEY": TRONGRID_API_KEY },
});

// --- WALLET INITIALIZATION (LAZY LOADED) ---
let evmWallet: ethers.Wallet;

async function initializeWallets() {
  if (evmWallet || !seedPhrase) return; // Initialize only once

  const hdNode = HDNodeWallet.fromPhrase(seedPhrase);
  const ethWalletNode = hdNode.derivePath(`m/44'/60'/0'/0/0`);
  evmWallet = new ethers.Wallet(ethWalletNode.privateKey);
  
  const tronWalletNode = HDNodeWallet.fromPhrase(seedPhrase).derivePath(`m/44'/195'/0'/0/0`);
  if (tronWalletNode.privateKey) {
    tron.setPrivateKey(tronWalletNode.privateKey.slice(2)); // remove 0x
  }
}

// --- EXPORTED GETTERS ---
export const getEvmWallet = async (chain: string) => { 
    await initializeWallets();
    switch (chain) {
        case 'ERC20':
        case 'ETH':
            return evmWallet.connect(ethProvider);
        case 'BEP20':
        case 'BSC':
            return evmWallet.connect(bscProvider);
        case 'Polygon':
        case 'MATIC':
            return evmWallet.connect(polygonProvider);
        case 'Arbitrum':
            return evmWallet.connect(arbitrumProvider);
        case 'Base':
            return evmWallet.connect(baseProvider);
        default:
            throw new Error(`Unsupported EVM chain for wallet: ${chain}`);
    }
};

// --- ADDRESS DERIVATION FUNCTIONS ---
export function getEVMAddress(index: number): string {
  if (!seedPhrase) throw new Error("Admin seed phrase is not configured.");
  const hdNode = HDNodeWallet.fromPhrase(seedPhrase);
  const child = hdNode.derivePath(`m/44'/60'/0'/0/${index}`);
  return child.address;
}

export function getTRONAddress(index: number): string {
    if (!seedPhrase) throw new Error("Admin seed phrase is not configured.");
    const wallet = HDNodeWallet.fromPhrase(seedPhrase).derivePath(`m/44'/195'/0'/0/index`);
    if(!wallet.privateKey) throw new Error("Could not derive Tron private key");
    return TronWeb.address.fromPrivateKey(wallet.privateKey.slice(2));
}

// --- UTILITY ---
export const networks = {
    ETH: 'ETH',
    TRX: 'TRX',
    BTC: 'BTC',
    LTC: 'LTC',
    BSC: 'BSC',
    POLYGON: 'POLYGON',
    ARBITRUM: 'ARBITRUM',
    BASE: 'BASE'
};
