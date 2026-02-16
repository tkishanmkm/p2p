import dotenv from 'dotenv';
dotenv.config();

import { ethers } from 'ethers';
import TronWeb from 'tronweb';
import bip39 from 'bip39';
import hdkey from 'ethereumjs-wallet/hdkey';
import * as bip32 from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';

// ------------------ CONFIG ------------------
const seedPhrase = process.env.ADMIN_MASTER_SEED!;
const INFURA_KEY = process.env.INFURA_API_KEY!;
const TRONGRID_KEY = process.env.TRONGRID_API_KEY!;
const GAS_MULTIPLIER = Number(process.env.GAS_MULTIPLIER || 2);

// ------------------ ETH / ERC20 / BSC ------------------
export const ethProvider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${INFURA_KEY}`);
const hdWallet = hdkey.fromMasterSeed(bip39.mnemonicToSeedSync(seedPhrase));
export const ethWallet = new ethers.Wallet(
  hdWallet.derivePath(`m/44'/60'/0'/0/0`).getWallet().getPrivateKey(),
  ethProvider
);

export function getETHDepositAddress(index = 0) {
  const wallet = hdWallet.derivePath(`m/44'/60'/0'/0/${index}`).getWallet();
  return '0x' + wallet.getAddress().toString('hex');
}

// ------------------ TRON / TRC20 ------------------
const tronPrivKey = hdWallet.derivePath(`m/44'/195'/0'/0/0`).getWallet().getPrivateKey().toString('hex');
export const tron = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  privateKey: tronPrivKey
});

export function getTRXDepositAddress(index = 0) {
  const wallet = hdWallet.derivePath(`m/44'/195'/0'/0/${index}`).getWallet();
  return TronWeb.address.fromPrivateKey(wallet.getPrivateKey().toString('hex'));
}

// ------------------ BTC ------------------
const btcRoot = bip32.fromSeed(bip39.mnemonicToSeedSync(seedPhrase), bitcoin.networks.bitcoin);
export function getBTCDepositAddress(index = 0) {
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
const ltcRoot = bip32.fromSeed(bip39.mnemonicToSeedSync(seedPhrase), litecoinNetwork);
export function getLTCDepositAddress(index = 0) {
  const child = ltcRoot.derivePath(`m/44'/2'/0'/0/${index}`);
  const { address } = bitcoin.payments.p2pkh({ pubkey: child.publicKey, network: litecoinNetwork });
  return address!;
}

// ------------------ UTILITY ------------------
export const networks = {
  ETH: 'ETH',
  TRX: 'TRX',
  BTC: 'BTC',
  LTC: 'LTC'
};

export const defaultGasMultiplier = GAS_MULTIPLIER;