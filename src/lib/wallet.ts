
'use client';
import {
  Firestore,
  doc,
  runTransaction,
  collection,
  writeBatch,
  serverTimestamp,
  addDoc,
  updateDoc,
  getDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import type { CryptoCurrency, P2PAd, Trade, UserWallet, Withdrawal, User as AppUser } from './types';
import { add } from 'date-fns';
import type { User as AuthUser } from 'firebase/auth';

// A simple utility for generating short, random IDs
function generateId(prefix: string, length: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
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
  paymentMethod: string
): Promise<string> {
    if (ad.userId === buyerId) {
        throw new Error("You cannot trade with yourself.");
    }

  const sellerWalletRef = doc(db, 'users', ad.userId, 'wallets', ad.crypto);
  const buyerDocRef = doc(db, 'users', buyerId);
  const newTradeRef = doc(collection(db, 'trades'));

  try {
    const newTradeId = await runTransaction(db, async (transaction) => {
      const sellerWalletDoc = await transaction.get(sellerWalletRef);
      const buyerDoc = await transaction.get(buyerDocRef);

      if (!sellerWalletDoc.exists()) {
        throw new Error("Seller's wallet does not exist.");
      }
       if (!buyerDoc.exists()) {
        throw new Error("Buyer's profile does not exist.");
      }
      const buyerData = buyerDoc.data() as AppUser;

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
        updatedAt: serverTimestamp(),
      });
      
      const cryptoFee = cryptoAmount * 0.01;

      // Create the new trade document
      const newTrade: Omit<Trade, 'id'> = {
        tradeId: generateId("T-", 8),
        adId: ad.id,
        buyerId: buyerId,
        sellerId: ad.userId,
        crypto: ad.crypto,
        amount: cryptoAmount,
        escrowFee: cryptoFee,
        fiatCurrency: ad.fiatCurrency,
        fiatAmount: fiatAmount,
        paymentMethod: paymentMethod,
        price: fiatAmount / cryptoAmount,
        status: 'active',
        claimedByBuyer: false,
        createdAt: new Date().toISOString(),
        expiresAt: add(new Date(), { minutes: 30 }).toISOString(),
        buyer: { userId: buyerData.userId },
        seller: { userId: ad.user.userId }
      };

      // Create notifications for both users
      const buyerNotificationRef = doc(collection(db, 'users', buyerId, 'notifications'));
      transaction.set(buyerNotificationRef, {
          userId: buyerId,
          message: `You have started a new trade (${newTrade.tradeId}) with ${ad.user.userId}.`,
          link: `/trade/${newTradeRef.id}`,
          isRead: false,
          createdAt: serverTimestamp(),
      });

      const sellerNotificationRef = doc(collection(db, 'users', ad.userId, 'notifications'));
      transaction.set(sellerNotificationRef, {
          userId: ad.userId,
          message: `${buyerData.userId} has started a new trade (${newTrade.tradeId}) with you.`,
          link: `/trade/${newTradeRef.id}`,
          isRead: false,
          createdAt: serverTimestamp(),
      });

      transaction.set(newTradeRef, newTrade);
      return newTradeRef.id;
    });
    return newTradeId;
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
  await updateDoc(tradeRef, {
      status: 'paid',
      paidAt: serverTimestamp()
  });
}

export async function addReceiptToTrade(db: Firestore, tradeId: string, receiptUrl: string) {
    const tradeRef = doc(db, 'trades', tradeId);
    await updateDoc(tradeRef, {
        paymentReceiptUrl: receiptUrl
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
        updatedAt: serverTimestamp(),
    });

    // Update trade status to released
    transaction.update(tradeRef, {
      status: 'released',
      releasedAt: serverTimestamp()
    });
  });
}

/**
 * Buyer claims the released funds.
 */
export async function claimFundsForTrade(db: Firestore, tradeId: string, buyerId: string) {
    const tradeRef = doc(db, 'trades', tradeId);
    
    // We need to get the crypto type inside the transaction for safety,
    // so we get it from the trade document itself.
    await runTransaction(db, async (transaction) => {
        const tradeDoc = await transaction.get(tradeRef);
        if (!tradeDoc.exists()) throw new Error("Trade not found.");
        const trade = tradeDoc.data() as Trade;
        
        if (trade.status !== 'released') throw new Error("Funds have not been released by the seller.");
        if (trade.buyerId !== buyerId) throw new Error("You are not the buyer of this trade.");
        if (trade.claimedByBuyer) throw new Error("Funds have already been claimed.");

        const fee = trade.escrowFee || (trade.amount * 0.01);
        const amountToBuyer = trade.amount - fee;

        const buyerWalletRef = doc(db, 'users', buyerId, 'wallets', trade.crypto);
        const buyerWalletDoc = await transaction.get(buyerWalletRef);
        let currentBalance = 0;
        let currentLockedBalance = 0;

        if (buyerWalletDoc.exists()) {
            currentBalance = (buyerWalletDoc.data() as UserWallet).balance;
            currentLockedBalance = (buyerWalletDoc.data() as UserWallet).lockedBalance;
        }
        
        transaction.set(buyerWalletRef, {
            balance: currentBalance + amountToBuyer,
            lockedBalance: currentLockedBalance,
            crypto: trade.crypto,
            userId: buyerId,
            id: trade.crypto,
            updatedAt: serverTimestamp(),
        }, { merge: true });

        transaction.update(tradeRef, { claimedByBuyer: true });

        const ledgerRef = doc(collection(db, "escrow_ledger"));
        transaction.set(ledgerRef, {
            tradeId: trade.id,
            feeAmount: fee,
            crypto: trade.crypto,
            createdAt: serverTimestamp()
        });
    });
}


/**
 * Cancels an active trade and returns locked funds to the seller.
 */
export async function cancelTrade(db: Firestore, tradeId: string) {
    const tradeRef = doc(db, 'trades', tradeId);

    await runTransaction(db, async (transaction) => {
        const tradeDoc = await transaction.get(tradeRef);
        if (!tradeDoc.exists()) {
          throw new Error("Trade does not exist.");
        }
        
        const trade = tradeDoc.data() as Trade;
        if (trade.status !== 'active' && trade.status !== 'paid') {
          throw new Error("Only active or paid trades can be cancelled.");
        }
        
        const sellerWalletRef = doc(db, 'users', trade.sellerId, 'wallets', trade.crypto);
        const sellerWalletDoc = await transaction.get(sellerWalletRef);
        if (!sellerWalletDoc.exists()) throw new Error("Seller wallet not found.");

        const sellerWallet = sellerWalletDoc.data() as UserWallet;
        if (sellerWallet.lockedBalance < trade.amount) {
            throw new Error("Seller has insufficient locked funds to return. Critical error.");
        }

        // Return funds to seller's main balance
        transaction.update(sellerWalletRef, {
            balance: sellerWallet.balance + trade.amount,
            lockedBalance: sellerWallet.lockedBalance - trade.amount,
            updatedAt: serverTimestamp(),
        });

        // Mark trade as cancelled
        transaction.update(tradeRef, { status: 'cancelled' });
    });
}

/**
 * Creates a withdrawal request and moves funds to locked balance.
 */
export async function requestWithdrawal(
  db: Firestore,
  user: AuthUser,
  values: Omit<Withdrawal, 'id' | 'createdAt' | 'status' | 'userId' | 'userDisplayName'>
): Promise<void> {
  const walletRef = doc(db, "users", user.uid, "wallets", values.crypto);

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    if (!walletDoc.exists()) {
      throw new Error("You do not have a wallet for this currency.");
    }
    const wallet = walletDoc.data() as UserWallet;
    if (wallet.balance < values.amount) {
      throw new Error("Insufficient available balance.");
    }

    // Move funds from available to locked
    transaction.update(walletRef, {
      balance: wallet.balance - values.amount,
      lockedBalance: wallet.lockedBalance + values.amount,
      updatedAt: serverTimestamp(),
    });

    // Create withdrawal request
    const withdrawalRef = collection(db, "users", user.uid, "withdrawals");
    const newWithdrawal: Omit<Withdrawal, 'id'> = {
      userId: user.uid,
      userDisplayName: user.displayName || 'Unknown',
      crypto: values.crypto as CryptoCurrency,
      chain: values.chain,
      address: values.address,
      amount: values.amount,
      status: 'pending',
      createdAt: new Date().toISOString(), // Placeholder
    };
     addDoc(withdrawalRef, {
        ...newWithdrawal,
        createdAt: serverTimestamp()
    });
  });
}

export async function cancelWithdrawal(db: Firestore, withdrawal: Withdrawal): Promise<void> {
    const withdrawalRef = doc(db, "users", withdrawal.userId, "withdrawals", withdrawal.id);
    const walletRef = doc(db, "users", withdrawal.userId, "wallets", withdrawal.crypto);

    await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists()) throw new Error("Wallet not found.");
        
        const wallet = walletDoc.data() as UserWallet;
        if (wallet.lockedBalance < withdrawal.amount) {
            throw new Error("Insufficient locked balance to return.");
        }

        // Return funds to available balance
        transaction.update(walletRef, {
            balance: wallet.balance + withdrawal.amount,
            lockedBalance: wallet.lockedBalance - withdrawal.amount,
            updatedAt: serverTimestamp(),
        });

        // Update withdrawal status
        transaction.update(withdrawalRef, { status: 'cancelled' });
    });
}


/**
 * Sends coins from one user to another in a single transaction.
 */
export async function sendCoinToUser(
  db: Firestore,
  sender: { uid: string; displayName: string | null },
  recipientUsername: string,
  crypto: CryptoCurrency,
  amount: number
): Promise<string> {
  if (sender.displayName === recipientUsername) {
    throw new Error("You cannot send coins to yourself.");
  }
  if (amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  const senderWalletRef = doc(db, "users", sender.uid, "wallets", crypto);
  const usersCollectionRef = collection(db, "users");
  const transferRef = doc(collection(db, "transfers"));

  return await runTransaction(db, async (transaction) => {
    // 1. Verify sender's balance
    const senderWalletDoc = await transaction.get(senderWalletRef);
    if (!senderWalletDoc.exists() || (senderWalletDoc.data() as UserWallet).balance < amount) {
      throw new Error(`Insufficient ${crypto} balance.`);
    }

    // 2. Find recipient by username
    const recipientQuery = query(usersCollectionRef, where("userId", "==", recipientUsername), limit(1));
    const recipientSnapshot = await transaction.get(recipientQuery);
    if (recipientSnapshot.empty) {
      throw new Error(`User "${recipientUsername}" not found.`);
    }
    const recipientDoc = recipientSnapshot.docs[0];
    const recipient = { id: recipientDoc.id, ...recipientDoc.data() as AppUser };

    // 3. Update sender's wallet
    const senderWallet = senderWalletDoc.data() as UserWallet;
    transaction.update(senderWalletRef, { balance: senderWallet.balance - amount });

    // 4. Update recipient's wallet (or create it)
    const recipientWalletRef = doc(db, "users", recipient.id, "wallets", crypto);
    const recipientWalletDoc = await transaction.get(recipientWalletRef);
    if (recipientWalletDoc.exists()) {
      const recipientWallet = recipientWalletDoc.data() as UserWallet;
      transaction.update(recipientWalletRef, { balance: recipientWallet.balance + amount });
    } else {
      transaction.set(recipientWalletRef, {
        balance: amount,
        lockedBalance: 0,
        crypto,
        userId: recipient.id,
        id: crypto,
        updatedAt: serverTimestamp(),
      });
    }

    // 5. Log the transfer
    const transferId = generateId("TX-", 10);
    transaction.set(transferRef, {
      publicId: transferId,
      senderId: sender.uid,
      recipientId: recipient.id,
      senderUsername: sender.displayName,
      recipientUsername: recipient.userId,
      crypto,
      amount,
      createdAt: serverTimestamp(),
    });
    
    // 6. Send notifications
    const senderNotifRef = doc(collection(db, `users/${sender.uid}/notifications`));
    transaction.set(senderNotifRef, {
        message: `You sent ${amount} ${crypto} to ${recipientUsername}.`,
        isRead: false,
        createdAt: serverTimestamp(),
        link: `/transfer`
    });

    const recipientNotifRef = doc(collection(db, `users/${recipient.id}/notifications`));
    transaction.set(recipientNotifRef, {
        message: `You received ${amount} ${crypto} from ${sender.displayName}.`,
        isRead: false,
        createdAt: serverTimestamp(),
        link: `/transfer`
    });
    
    return transferId;
  });
}

  
