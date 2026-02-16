
import dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';
import TronWeb from 'tronweb';
import bip39 from 'bip39';
import hdkey from 'ethereumjs-wallet/hdkey';
import * as bip32 from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';

// --- CONFIGURATION ---
const seedPhrase = process.env.ADMIN_MASTER_SEED;
const INFURA_KEY = process.env.INFURA_API_KEY;
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY;

if (!seedPhrase) {
    console.warn("CRITICAL: ADMIN_MASTER_SEED environment variable not set. On-chain operations will fail.");
}

// --- ETH / ERC20 / BSC (BEP20) SETUP ---
let hdWallet: hdkey;
let ethWallet: ethers.Wallet;
let bscWallet: ethers.Wallet;
let btcRoot: bip32.BIP32Interface;
let ltcRoot: bip32.BIP32Interface;

export const ethProvider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_KEY}`);
export const bscProvider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');

// --- TRON / TRC20 SETUP ---
export const tron = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { "TRON-PRO-API-KEY": TRONGRID_API_KEY },
});

// Async initialization function to handle async operations
async function initializeWallets() {
  if (hdWallet || !seedPhrase) return; // Initialize only once

  const seed = await bip39.mnemonicToSeed(seedPhrase);
  hdWallet = hdkey.fromMasterSeed(seed);
  
  const ethPrivateKey = hdWallet.derivePath(`m/44'/60'/0'/0/0`).getWallet().getPrivateKey();
  ethWallet = new ethers.Wallet(ethPrivateKey, ethProvider);
  bscWallet = new ethers.Wallet(ethPrivateKey, bscProvider);
  
  const tronPrivKey = hdWallet.derivePath(`m/44'/195'/0'/0/0`).getWallet().getPrivateKey().toString('hex');
  tron.setPrivateKey(tronPrivKey);
  
  btcRoot = bip32.fromSeed(seed, bitcoin.networks.bitcoin);

  const litecoinNetwork = {
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    bip32: { public: 0x019da462, private: 0x019d9cfe },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0
  };
  ltcRoot = bip32.fromSeed(seed, litecoinNetwork);
}

// --- EXPORTED GETTERS ---
export const getEthWallet = async () => { await initializeWallets(); return ethWallet; };
export const getBscWallet = async () => { await initializeWallets(); return bscWallet; };


// --- ADDRESS DERIVATION FUNCTIONS ---
export async function getDepositAddress(userIndex: number, crypto: string, chain: string): Promise<string> {
  await initializeWallets(); // Ensure wallets are initialized

  switch (chain) {
    case 'Bitcoin':
      const btcChild = btcRoot.derivePath(`m/44'/0'/0'/0/${userIndex}`);
      return bitcoin.payments.p2pkh({ pubkey: btcChild.publicKey }).address!;
    case 'Litecoin':
      const ltcChild = ltcRoot.derivePath(`m/44'/2'/0'/0/${userIndex}`);
      return bitcoin.payments.p2pkh({ pubkey: ltcChild.publicKey, network: ltcRoot.network }).address!;
    case 'ERC20':
    case 'BEP20':
      const ethWalletNode = hdWallet.derivePath(`m/44'/60'/0'/0/${userIndex}`).getWallet();
      return '0x' + ethWalletNode.getAddress().toString('hex');
    case 'TRC20':
      const tronNode = hdWallet.derivePath(`m/44'/195'/0'/0/${userIndex}`);
      return TronWeb.address.fromPrivateKey(tronNode.getWallet().getPrivateKey().toString('hex'));
    default:
      throw new Error(`Unsupported crypto/chain for address generation: ${crypto}/${chain}`);
  }
}

export async function estimateGasFeeNative(chain: string): Promise<{ fee: number; nativeSymbol: 'ETH' | 'BNB' | 'TRX' | 'BTC' | 'LTC' }> {
  await initializeWallets();
  try {
    switch (chain) {
      case 'ERC20': {
        const provider = ethProvider;
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits('5', 'gwei');
        const gasLimit = BigInt(65000);
        const gasCost = gasLimit * gasPrice;
        return { fee: parseFloat(ethers.formatEther(gasCost)), nativeSymbol: 'ETH' };
      }
      case 'BEP20': {
        const provider = bscProvider;
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits('3', 'gwei');
        const gasLimit = BigInt(65000);
        const gasCost = gasLimit * gasPrice;
        return { fee: parseFloat(ethers.formatEther(gasCost)), nativeSymbol: 'BNB' };
      }
      case 'TRC20':
        return { fee: 30, nativeSymbol: 'TRX' };
      case 'Bitcoin':
        return { fee: 0.0001, nativeSymbol: 'BTC' };
      case 'Litecoin':
        return { fee: 0.001, nativeSymbol: 'LTC' };
      case 'Native_ETH': {
        const provider = ethProvider;
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.parseUnits('5', 'gwei');
        const gasLimit = BigInt(21000);
        const gasCost = gasLimit * gasPrice;
        return { fee: parseFloat(ethers.formatEther(gasCost)), nativeSymbol: 'ETH' };
      }
      default:
        throw new Error(`Unsupported chain for fee estimation: ${chain}`);
    }
  } catch (error) {
    console.error(`Failed to estimate gas for ${chain}:`, error);
    if (chain === 'ERC20') return { fee: 0.001, nativeSymbol: 'ETH' };
    if (chain === 'BEP20') return { fee: 0.005, nativeSymbol: 'BNB' };
    if (chain === 'TRC20') return { fee: 30, nativeSymbol: 'TRX' };
    if (chain === 'Bitcoin') return { fee: 0.0001, nativeSymbol: 'BTC' };
    if (chain === 'Litecoin') return { fee: 0.001, nativeSymbol: 'LTC' };
    if (chain === 'Native_ETH') return { fee: 0.0005, nativeSymbol: 'ETH' };
    throw new Error('Fee estimation failed with fallback.');
  }
}
