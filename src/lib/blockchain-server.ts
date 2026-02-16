
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
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL;
const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL;
const BASE_RPC_URL = process.env.BASE_RPC_URL;


if (!seedPhrase) {
    console.warn("CRITICAL: ADMIN_MASTER_SEED environment variable not set. On-chain operations will fail.");
}

// --- PROVIDERS SETUP ---
export const ethProvider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_KEY}`);
export const bscProvider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
export const polygonProvider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
export const arbitrumProvider = new ethers.JsonRpcProvider(ARBITRUM_RPC_URL);
export const baseProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);

export const tron = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { "TRON-PRO-API-KEY": TRONGRID_API_KEY },
});

// --- WALLET INITIALIZATION (LAZY LOADED) ---
let hdWallet: hdkey;
let evmWallet: ethers.Wallet; // One wallet for all EVM chains
let btcRoot: bip32.BIP32Interface;
let ltcRoot: bip32.BIP32Interface;

async function initializeWallets() {
  if (hdWallet || !seedPhrase) return; // Initialize only once

  const seed = await bip39.mnemonicToSeed(seedPhrase);
  hdWallet = hdkey.fromMasterSeed(seed);
  
  const ethPrivateKey = hdWallet.derivePath(`m/44'/60'/0'/0/0`).getWallet().getPrivateKey();
  evmWallet = new ethers.Wallet(ethPrivateKey); // Generic EVM wallet
  
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
export const getEvmWallet = async (chain: string) => { 
    await initializeWallets();
    switch (chain) {
        case 'ERC20':
        case 'Arbitrum':
        case 'Base':
            return evmWallet.connect(ethProvider);
        case 'BEP20':
            return evmWallet.connect(bscProvider);
        case 'Polygon':
            return evmWallet.connect(polygonProvider);
        default:
            throw new Error(`Unsupported EVM chain for wallet: ${chain}`);
    }
};

// --- ADDRESS DERIVATION FUNCTIONS ---
export async function getDepositAddress(userIndex: number, crypto: string, chain: string): Promise<string> {
  await initializeWallets();

  switch (chain) {
    case 'Bitcoin':
      const btcChild = btcRoot.derivePath(`m/44'/0'/0'/0/${userIndex}`);
      return bitcoin.payments.p2pkh({ pubkey: btcChild.publicKey }).address!;
    case 'Litecoin':
      const ltcChild = ltcRoot.derivePath(`m/44'/2'/0'/0/${userIndex}`);
      return bitcoin.payments.p2pkh({ pubkey: ltcChild.publicKey, network: ltcRoot.network }).address!;
    case 'ERC20':
    case 'BEP20':
    case 'Polygon':
    case 'Arbitrum':
    case 'Base':
      const ethWalletNode = hdWallet.derivePath(`m/44'/60'/0'/0/${userIndex}`).getWallet();
      return '0x' + ethWalletNode.getAddress().toString('hex');
    case 'TRC20':
      const tronNode = hdWallet.derivePath(`m/44'/195'/0'/0/${userIndex}`);
      return TronWeb.address.fromPrivateKey(tronNode.getWallet().getPrivateKey().toString('hex'));
    default:
      throw new Error(`Unsupported crypto/chain for address generation: ${crypto}/${chain}`);
  }
}

export async function estimateGasFeeNative(chain: string): Promise<{ fee: number; nativeSymbol: 'ETH' | 'BNB' | 'TRX' | 'BTC' | 'LTC' | 'MATIC' }> {
  await initializeWallets();
  try {
    let provider: ethers.JsonRpcProvider;
    let nativeSymbol: 'ETH' | 'BNB' | 'TRX' | 'BTC' | 'LTC' | 'MATIC';
    let gasLimit = BigInt(21000); // Default for native transfer

    switch (chain) {
      case 'ERC20': case 'Arbitrum': case 'Base':
        provider = ethProvider; nativeSymbol = 'ETH'; gasLimit = BigInt(65000); break;
      case 'BEP20':
        provider = bscProvider; nativeSymbol = 'BNB'; gasLimit = BigInt(65000); break;
      case 'Polygon':
        provider = polygonProvider; nativeSymbol = 'MATIC'; gasLimit = BigInt(65000); break;
      case 'TRC20':
        return { fee: 30, nativeSymbol: 'TRX' };
      case 'Bitcoin':
        return { fee: 0.0001, nativeSymbol: 'BTC' };
      case 'Litecoin':
        return { fee: 0.001, nativeSymbol: 'LTC' };
      case 'Native_ETH':
        provider = ethProvider; nativeSymbol = 'ETH'; break;
      default:
        throw new Error(`Unsupported chain for fee estimation: ${chain}`);
    }

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('5', 'gwei'); // Fallback gas price
    const gasCost = gasLimit * gasPrice;
    return { fee: parseFloat(ethers.formatEther(gasCost)), nativeSymbol };

  } catch (error) {
    console.error(`Failed to estimate gas for ${chain}:`, error);
    // Fallback fees
    if (['ERC20', 'Arbitrum', 'Base', 'Native_ETH'].includes(chain)) return { fee: 0.001, nativeSymbol: 'ETH' };
    if (chain === 'BEP20') return { fee: 0.0005, nativeSymbol: 'BNB' };
    if (chain === 'Polygon') return { fee: 0.1, nativeSymbol: 'MATIC' };
    if (chain === 'TRC20') return { fee: 30, nativeSymbol: 'TRX' };
    if (chain === 'Bitcoin') return { fee: 0.0001, nativeSymbol: 'BTC' };
    if (chain === 'Litecoin') return { fee: 0.001, nativeSymbol: 'LTC' };
    throw new Error('Fee estimation failed with fallback.');
  }
}
