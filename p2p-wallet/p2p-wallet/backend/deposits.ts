import { firestore } from 'firebase-admin';
import { ethProvider, tron, getDepositAddress, networks } from './blockchain';
import { ethers } from 'ethers';

// ------------------ Types ------------------
interface Deposit {
  userId: string;
  crypto: string;
  amount: number;
  txId: string;
  createdAt: Date;
}

// ------------------ Firestore References ------------------
function getUserWalletRef(userId: string, crypto: string) {
  return firestore().collection('users').doc(userId).collection('wallets').doc(crypto);
}

function getDepositHistoryRef(userId: string) {
  return firestore().collection('users').doc(userId).collection('deposits');
}

// ------------------ ETH Deposit Detection ------------------
export async function checkETHDeposits(userId: string, index: number) {
  const address = getDepositAddress(index, networks.ETH);
  const balance = await ethProvider.getBalance(address);
  if (balance.isZero()) return;

  const walletRef = getUserWalletRef(userId, 'ETH');
  const depositRef = getDepositHistoryRef(userId);

  // Update balance
  await walletRef.set({ balance: parseFloat(ethers.formatEther(balance)), crypto: 'ETH' }, { merge: true });

  // Record transaction
  await depositRef.add({
    userId,
    crypto: 'ETH',
    amount: parseFloat(ethers.formatEther(balance)),
    txId: 'on-chain', // For full integration, capture tx hash
    createdAt: new Date()
  });

  console.log(`ETH deposit detected for ${userId} at ${address}`);
}

// ------------------ TRON/TRC20 Deposit Detection ------------------
export async function checkTRXDeposits(userId: string, index: number) {
  const address = getDepositAddress(index, networks.TRX);
  const balance = await tron.trx.getBalance(address);
  if (balance === 0) return;

  const walletRef = getUserWalletRef(userId, 'TRX');
  const depositRef = getDepositHistoryRef(userId);

  await walletRef.set({ balance, crypto: 'TRX' }, { merge: true });
  await depositRef.add({
    userId,
    crypto: 'TRX',
    amount: balance,
    txId: 'on-chain',
    createdAt: new Date()
  });

  console.log(`TRX deposit detected for ${userId} at ${address}`);
}

// ------------------ BTC / LTC Deposit Detection (simulation) ------------------
export async function checkBTCDeposits(userId: string, index: number) {
  const address = getDepositAddress(index, networks.BTC);
  // TODO: Use bitcoinjs-lib + node RPC to detect real BTC deposits
  console.log(`BTC deposit simulated for ${userId} at ${address}`);
}

export async function checkLTCDeposits(userId: string, index: number) {
  const address = getDepositAddress(index, networks.LTC);
  // TODO: Use litecoin-lib + node RPC to detect real LTC deposits
  console.log(`LTC deposit simulated for ${userId} at ${address}`);
}

// ------------------ General Function ------------------
export async function checkAllDeposits(userId: string, index: number) {
  await checkETHDeposits(userId, index);
  await checkTRXDeposits(userId, index);
  await checkBTCDeposits(userId, index);
  await checkLTCDeposits(userId, index);
}