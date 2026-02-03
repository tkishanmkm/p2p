// This is a new file
'use client';
import {
  Firestore,
  doc,
  runTransaction,
  collection,
  writeBatch,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import type { CryptoCurrency, P2PAd, Trade, UserWallet } from './types';
import { add } from 'date-fns';

// A simple utility for generating short, random IDs
function generateTradeId() {
  const prefix = "T-";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + result;
}

/**
 * Initiates a trade by locking the seller's funds and creating the trade document.
 * This function should be called by the buyer.
 */
export async function initiateTrade(
  db: Firestore,
  buyerId: string,
  ad: P2PAd,
  cryptoAmount: number,
  fiatAmount: number,
): Promise<string> {
    if (ad.userId === buyerId) {
        throw new Error("You cannot trade with yourself.");
    }

  const sellerWalletRef = doc(db, 'users', ad.userId, 'wallets', ad.crypto);
  const newTradeRef = doc(collection(db, 'trades'));

  try {
    await runTransaction(db, async (transaction) => {
      const sellerWalletDoc = await transaction.get(sellerWalletRef);

      if (!sellerWalletDoc.exists()) {
        throw new Error("Seller's wallet does not exist.");
      }

      const sellerWallet = sellerWalletDoc.data() as UserWallet;
      if (sellerWallet.balance < cryptoAmount) {
        throw new Error('Seller has insufficient funds.');
      }

      // Lock seller's funds
      const newSellerBalance = sellerWallet.balance - cryptoAmount;
      const newSellerLockedBalance = sellerWallet.lockedBalance + cryptoAmount;
      transaction.update(sellerWalletRef, {
        balance: newSellerBalance,
        lockedBalance: newSellerLockedBalance,
        updatedAt: new Date().toISOString(),
      });

      // Create the new trade document
      const newTrade: Omit<Trade, 'id'> = {
        tradeId: generateTradeId(),
        adId: ad.id,
        buyerId: buyerId,
        sellerId: ad.userId,
        crypto: ad.crypto,
        amount: cryptoAmount,
        fiatCurrency: ad.fiatCurrency,
        fiatAmount: fiatAmount,
        price: fiatAmount / cryptoAmount,
        status: 'active',
        claimedByBuyer: false,
        createdAt: new Date().toISOString(),
        expiresAt: add(new Date(), { minutes: 30 }).toISOString(),
        // Denormalize for easy access in UI
        buyer: { userId: 'temp-buyer-id' }, // will be updated with real user id
        seller: { userId: ad.user.userId }
      };

      transaction.set(newTradeRef, newTrade);
    });
    return newTradeRef.id;
  } catch (error) {
    console.error('Transaction failed: ', error);
    throw error;
  }
}

/**
 * Updates a trade's status to 'paid'. Called by the buyer.
 */
export async function markTradeAsPaid(db: Firestore, tradeId: string) {
  const tradeRef = doc(db, 'trades', tradeId);
  await runTransaction(db, async (transaction) => {
    const tradeDoc = await transaction.get(tradeRef);
    if (!tradeDoc.exists() || tradeDoc.data().status !== 'active') {
      throw new Error("Trade is not active or does not exist.");
    }
    transaction.update(tradeRef, {
      status: 'paid',
      paidAt: new Date().toISOString()
    });
  });
}

/**
 * Seller releases funds. This moves funds from locked to available for the buyer to claim.
 */
export async function releaseFundsFromEscrow(db: Firestore, tradeId: string) {
  const tradeRef = doc(db, 'trades', tradeId);
  await runTransaction(db, async (transaction) => {
    const tradeDoc = await transaction.get(tradeRef);
    if (!tradeDoc.exists()) throw new Error("Trade not found.");
    
    const trade = tradeDoc.data() as Trade;
    if (trade.status !== 'paid') throw new Error("Trade has not been marked as paid by the buyer.");

    const sellerWalletRef = doc(db, 'users', trade.sellerId, 'wallets', trade.crypto);
    const sellerWalletDoc = await transaction.get(sellerWalletRef);
    if (!sellerWalletDoc.exists()) throw new Error("Seller wallet not found.");

    const sellerWallet = sellerWalletDoc.data() as UserWallet;
    if (sellerWallet.lockedBalance < trade.amount) {
        throw new Error("Seller has insufficient locked funds. Critical error.");
    }
    
    // Decrement seller's locked balance
    transaction.update(sellerWalletRef, {
        lockedBalance: sellerWallet.lockedBalance - trade.amount,
        updatedAt: new Date().toISOString(),
    });

    // Update trade status to released
    transaction.update(tradeRef, {
      status: 'released',
      releasedAt: new Date().toISOString()
    });
  });
}

/**
 * Buyer claims the released funds.
 */
export async function claimFundsForTrade(db: Firestore, tradeId: string, buyerId: string) {
  const tradeRef = doc(db, 'trades', tradeId);
  const buyerWalletRef = doc(db, 'users', buyerId, 'wallets', (await getDoc(tradeRef)).data()!.crypto);

  await runTransaction(db, async (transaction) => {
    const tradeDoc = await transaction.get(tradeRef);
    if (!tradeDoc.exists()) throw new Error("Trade not found.");
    
    const trade = tradeDoc.data() as Trade;
    if (trade.status !== 'released') throw new Error("Funds have not been released by the seller.");
    if (trade.buyerId !== buyerId) throw new Error("You are not the buyer of this trade.");
    if (trade.claimedByBuyer) throw new Error("Funds have already been claimed.");

    const buyerWalletDoc = await transaction.get(buyerWalletRef);
    let currentBalance = 0;

    if (buyerWalletDoc.exists()) {
        currentBalance = (buyerWalletDoc.data() as UserWallet).balance;
    }
    
    // Increment buyer's balance (or create wallet if not exists)
    transaction.set(buyerWalletRef, {
        balance: currentBalance + trade.amount,
        lockedBalance: buyerWalletDoc.exists() ? buyerWalletDoc.data().lockedBalance : 0,
        crypto: trade.crypto,
        userId: buyerId,
        id: trade.crypto,
        updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Mark trade as claimed
    transaction.update(tradeRef, { claimedByBuyer: true });
  });
}


/**
 * Cancels an active trade and returns locked funds to the seller.
 */
export async function cancelTrade(db: Firestore, tradeId: string, sellerId: string, crypto: CryptoCurrency, amount: number) {
  const tradeRef = doc(db, 'trades', tradeId);
  const sellerWalletRef = doc(db, 'users', sellerId, 'wallets', crypto);

  await runTransaction(db, async (transaction) => {
    const tradeDoc = await transaction.get(tradeRef);
    if (!tradeDoc.exists() || tradeDoc.data().status !== 'active') {
      throw new Error("Only active trades can be cancelled.");
    }
    
    const sellerWalletDoc = await transaction.get(sellerWalletRef);
    if (!sellerWalletDoc.exists()) throw new Error("Seller wallet not found.");

    const sellerWallet = sellerWalletDoc.data() as UserWallet;
    if (sellerWallet.lockedBalance < amount) {
        throw new Error("Seller has insufficient locked funds to return. Critical error.");
    }

    // Return funds to seller's main balance
    transaction.update(sellerWalletRef, {
        balance: sellerWallet.balance + amount,
        lockedBalance: sellerWallet.lockedBalance - amount,
        updatedAt: new Date().toISOString(),
    });

    // Mark trade as cancelled
    transaction.update(tradeRef, { status: 'cancelled' });
  });
}
async function getDoc(docRef: any) {
    const { getDoc } = await import("firebase/firestore");
    return getDoc(docRef);
}
