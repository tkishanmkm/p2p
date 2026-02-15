import dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';
import TronWeb from 'tronweb';
import bip39 from 'bip39';
import hdkey from 'ethereumjs-wallet/hdkey';

const seedPhrase = process.env.ADMIN_MASTER_SEED!;
const INFURA_KEY = process.env.INFURA_API_KEY!;
const TRONGRID_KEY = process.env.TRONGRID_API_KEY!;

// ================= ETH =================
export const ethProvider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_KEY}`);
const hdWallet = hdkey.fromMasterSeed(bip39.mnemonicToSeedSync(seedPhrase));

export const ethWallet = new ethers.Wallet(
  hdWallet.derivePath(`m/44'/60'/0'/0/0`).getWallet().getPrivateKey(),
  ethProvider
);

// ================= TRON =================
const tronPrivKey = hdWallet.derivePath(`m/44'/195'/0'/0/0`).getWallet().getPrivateKey().toString('hex');
export const tron = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  privateKey: tronPrivKey
});

// ================= Address Generators =================
export function getETHDepositAddress(index = 0) {
  const wallet = hdWallet.derivePath(`m/44'/60'/0'/0/${index}`).getWallet();
  return '0x' + wallet.getAddress().toString('hex');
}

export function getTRXDepositAddress(index = 0) {
  const wallet = hdWallet.derivePath(`m/44'/195'/0'/0/${index}`).getWallet();
  return TronWeb.address.fromPrivateKey(wallet.getPrivateKey().toString('hex'));
}