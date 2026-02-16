
import { ethers, HDNodeWallet, JsonRpcProvider } from "ethers";
import TronWeb from "tronweb";
import { getEnv } from "./config";

const env = getEnv();

if (!env.ADMIN_MASTER_SEED) {
    throw new Error("CRITICAL: ADMIN_MASTER_SEED environment variable not set.");
}

// --- Ethereum Provider Setup ---
export const ethProvider = new JsonRpcProvider(env.ETH_RPC);

// --- Tron Provider Setup ---
export const tronWeb = new TronWeb({
  fullHost: env.TRON_RPC,
  headers: { "TRON-PRO-API-KEY": env.TRONGRID_API_KEY },
});

// --- Address Derivation Functions ---

/**
 * Derives an EVM-compatible address from the master seed at a given index.
 * @param index The user's unique wallet index.
 * @returns The derived EVM address.
 */
export function getEVMAddress(index: number): string {
  const hdNode = HDNodeWallet.fromPhrase(env.ADMIN_MASTER_SEED);
  const childNode = hdNode.derivePath(`m/44'/60'/0'/0/${index}`);
  return childNode.address;
}

/**
 * Derives a Tron address from the master seed at a given index.
 * @param index The user's unique wallet index.
 * @returns The derived Tron address.
 */
export function getTRONAddress(index: number): string {
  const wallet = HDNodeWallet.fromPhrase(env.ADMIN_MASTER_SEED)
      .derivePath(`m/44'/195'/0'/0/${index}`);
  return tronWeb.address.fromPrivateKey(wallet.privateKey);
}

/**
 * Derives the private key for an EVM address. SERVER-SIDE ONLY.
 * @param index The user's unique wallet index.
 * @returns The private key string.
 */
export function getEVMPrivateKey(index: number): string {
    const hdNode = HDNodeWallet.fromPhrase(env.ADMIN_MASTER_SEED);
    const childNode = hdNode.derivePath(`m/44'/60'/0'/0/${index}`);
    return childNode.privateKey;
}

/**
 * Derives the private key for a Tron address. SERVER-SIDE ONLY.
 * @param index The user's unique wallet index.
 * @returns The private key string.
 */
export function getTRONPrivateKey(index: number): string {
    const wallet = HDNodeWallet.fromPhrase(env.ADMIN_MASTER_SEED)
        .derivePath(`m/44'/195'/0'/0/${index}`);
    return wallet.privateKey;
}
