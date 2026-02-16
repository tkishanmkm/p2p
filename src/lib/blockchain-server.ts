
import dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';
import TronWeb from 'tronweb';
import bip39 from 'bip39';
import hdkey from 'ethereumjs-wallet/hdkey';
import * as bip32 from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';

// ------------------ CONFIG ------------------
const seedPhrase = process.env.ADMIN_MASTER_SEED;
const INFURA_KEY = process.env.INFURA_API_KEY;
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY;

if (!seedPhrase) {
    throw new Error("ADMIN_MASTER_SEED environment variable not set.");
}
if (!INFURA_KEY) {
    throw new Error("INFURA_API_KEY environment variable not set.");
}
if (!TRONGRID_API_KEY) {
    throw new Error("TRONGRID_API_KEY environment variable not set.");
}


// ------------------ ETH / ERC20 / BSC (BEP20) ------------------
export const ethProvider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_KEY}`);
export const bscProvider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
const hdWallet = hdkey.fromMasterSeed(await bip39.mnemonicToSeed(seedPhrase));

export const ethWallet = new ethers.Wallet(hdWallet.derivePath(`m/44'/60'/0'/0/0`).getWallet().getPrivateKey(), ethProvider);
export const bscWallet = new ethers.Wallet(hdWallet.derivePath(`m/44'/60'/0'/0/0`).getWallet().getPrivateKey(), bscProvider);


function getEthDerivationAddress(index: number) {
  const wallet = hdWallet.derivePath(`m/44'/60'/0'/0/${index}`).getWallet();
  return '0x' + wallet.getAddress().toString('hex');
}

// ------------------ TRON / TRC20 ------------------
const tronPrivKey = hdWallet.derivePath(`m/44'/195'/0'/0/0`).getWallet().getPrivateKey().toString('hex');
export const tron = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { "TRON-PRO-API-KEY": TRONGRID_API_KEY },
  privateKey: tronPrivKey
});

function getTRXDepositAddress(index: number) {
  const node = hdWallet.derivePath(`m/44'/195'/0'/0/${index}`);
  const privateKey = node.getWallet().getPrivateKey().toString('hex');
  return TronWeb.address.fromPrivateKey(privateKey);
}

// ------------------ BTC ------------------
const btcRoot = bip32.fromSeed(await bip39.mnemonicToSeed(seedPhrase), bitcoin.networks.bitcoin);
function getBTCDepositAddress(index: number) {
  const child = btcRoot.derivePath(`m/44'/0'/0'/0/${index}`);
  const { address } = bitcoin.payments.p2pkh({ pubkey: child.publicKey });
  return address!;
}

// ------------------ LTC ------------------
const litecoinNetwork = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: { public: 0x019da462, private: 0x019d9cfe },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0
};
const ltcRoot = bip32.fromSeed(await bip39.mnemonicToSeed(seedPhrase), litecoinNetwork);
function getLTCDepositAddress(index: number) {
  const child = ltcRoot.derivePath(`m/44'/2'/0'/0/${index}`);
  const { address } = bitcoin.payments.p2pkh({ pubkey: child.publicKey, network: litecoinNetwork });
  return address!;
}

// ------------------ UNIFIED DISPATCHER ------------------
export function getDepositAddress(userIndex: number, crypto: string, chain: string): string {
  switch (chain) {
    case 'Bitcoin':
      return getBTCDepositAddress(userIndex);
    case 'Litecoin':
      return getLTCDepositAddress(userIndex);
    case 'ERC20':
    case 'BEP20':
      return getEthDerivationAddress(userIndex);
    case 'TRC20':
      return getTRXDepositAddress(userIndex);
    default:
      throw new Error(`Unsupported crypto/chain for address generation: ${crypto}/${chain}`);
  }
}
