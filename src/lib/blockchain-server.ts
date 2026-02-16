
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
let evmWallet: ethers.Wallet; // One wallet for all EVM chains

async function initializeWallets() {
  if (evmWallet || !seedPhrase) return; // Initialize only once

  const hdNode = HDNodeWallet.fromPhrase(seedPhrase);
  const ethWalletNode = hdNode.derivePath(`m/44'/60'/0'/0/0`);
  evmWallet = new ethers.Wallet(ethWalletNode.privateKey);
  
  const tronWalletNode = HDNodeWallet.fromPhrase(seedPhrase).derivePath(`m/44'/195'/0'/0/0`);
  tron.setPrivateKey(tronWalletNode.privateKey);
}

// --- EXPORTED GETTERS ---
export const getEvmWallet = async (chain: string) => { 
    await initializeWallets();
    switch (chain) {
        case 'ERC20':
            return evmWallet.connect(ethProvider);
        case 'BEP20':
            return evmWallet.connect(bscProvider);
        case 'Polygon':
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
    const wallet = HDNodeWallet.fromPhrase(seedPhrase).derivePath(`m/44'/195'/0'/0/${index}`);
    return tron.address.fromPrivateKey(wallet.privateKey);
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
