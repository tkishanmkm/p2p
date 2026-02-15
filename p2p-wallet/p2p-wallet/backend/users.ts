import { getFirestore, doc, setDoc, getDoc } from 'firebase-admin/firestore';
import { UserWallet } from './types';

const firestore = getFirestore();

export async function createUserWallets(userId: string) {
  const coins: UserWallet[] = [
    { crypto: 'BTC', balance: 0, lockedBalance: 0 },
    { crypto: 'ETH', balance: 0, lockedBalance: 0 },
    { crypto: 'LTC', balance: 0, lockedBalance: 0 },
    { crypto: 'USDT', balance: 0, lockedBalance: 0 },
    { crypto: 'TRC20', balance: 0, lockedBalance: 0 }
  ];

  for (const wallet of coins) {
    const walletRef = doc(firestore, 'users', userId, 'wallets', wallet.crypto);
    const snap = await getDoc(walletRef);
    if (!snap.exists()) {
      await setDoc(walletRef, wallet);
    }
  }
  console.log(`Wallets created for user ${userId}`);
}