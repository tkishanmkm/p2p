import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase-admin/firestore';
import { ethWallet, tron, getETHDepositAddress, getTRXDepositAddress } from './blockchain';
import { UserWallet, Deposit } from './types';

const firestore = getFirestore();

// ================== Record ETH Deposit ==================
export async function recordETHDeposit(userId: string, amount: number, txHash: string) {
  const walletRef = doc(firestore, 'users', userId, 'wallets', 'ETH');
  const snap = await getDoc(walletRef);
  let balance = snap.exists() ? snap.data()?.balance || 0 : 0;
  balance += amount;
  await setDoc(walletRef, { balance }, { merge: true });

  const depositRef = doc(firestore, 'deposits', txHash);
  await setDoc(depositRef, {
    userId,
    crypto: 'ETH',
    amount,
    txId: txHash,
    status: 'completed',
    createdAt: Timestamp.now()
  });
  console.log(`ETH deposit recorded: ${txHash}, amount: ${amount}`);
}

// ================== Record TRC20 Deposit ==================
export async function recordTRC20Deposit(userId: string, amount: number, txId: string, tokenContract: string) {
  const walletRef = doc(firestore, 'users', userId, 'wallets', 'TRC20');
  const snap = await getDoc(walletRef);
  let balance = snap.exists() ? snap.data()?.balance || 0 : 0;
  balance += amount;
  await setDoc(walletRef, { balance }, { merge: true });

  const depositRef = doc(firestore, 'deposits', txId);
  await setDoc(depositRef, {
    userId,
    crypto: 'TRC20',
    amount,
    txId,
    tokenContract,
    status: 'completed',
    createdAt: Timestamp.now()
  });
  console.log(`TRC20 deposit recorded: ${txId}, amount: ${amount}`);
}

// ================== Generate Deposit Address ==================
export function generateETHAddress(userIndex: number) {
  return getETHDepositAddress(userIndex);
}

export function generateTRXAddress(userIndex: number) {
  return getTRXDepositAddress(userIndex);
}