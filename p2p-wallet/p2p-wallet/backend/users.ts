import { firestore } from 'firebase-admin';
import { getDepositAddress, networks } from './blockchain';

// ---------------- Types ----------------
interface UserWallet {
  crypto: string;
  balance: number;
  lockedBalance: number;
  depositAddress: string;
}

// ---------------- Firestore References ----------------
function getUserWalletRef(userId: string, crypto: string) {
  return firestore().collection('users').doc(userId).collection('wallets').doc(crypto);
}

// ---------------- Create Wallets for a New User ----------------
export async function createUserWallets(userId: string) {
  const supportedCoins = ['BTC', 'ETH', 'LTC', 'USDT', 'BSC']; // add more if needed

  for (let i = 0; i < supportedCoins.length; i++) {
    const crypto = supportedCoins[i];
    const walletRef = getUserWalletRef(userId, crypto);

    // Generate deposit address based on user index
    const depositAddress = getDepositAddress(i, networks[crypto as keyof typeof networks]);

    // Initialize wallet
    const walletData: UserWallet = {
      crypto,
      balance: 0,
      lockedBalance: 0,
      depositAddress
    };

    await walletRef.set(walletData);
    console.log(`Wallet created for user ${userId} - ${crypto}: ${depositAddress}`);
  }
}