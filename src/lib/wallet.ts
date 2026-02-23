
'use client';
import {
  Firestore,
  doc,
  runTransaction,
  collection,
  writeBatch,
  addDoc,
  updateDoc,
  getDoc,
  query,
  where,
  limit,
  getDocs,
  setDoc,
  orderBy,
  DocumentReference,
} from 'firebase/firestore';
import type { CryptoCurrency, P2PAd, Trade, UserWallet, User as AppUser, Withdrawal, Deposit } from './types';
import { add, isPast } from 'date-fns';
import { toDate } from '@/lib/utils';
import { SUPPORTED_CRYPTOS, CHAINS } from './constants';

function generateId(prefix: string, length: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + result;
}

export async function initiateTrade(
  db: Firestore,
  initiatorId: string,
  ad: P2PAd,
  cryptoAmount: number,
  fiatAmount: number,
  fiatAmountInUSD: number,
  paymentMethod: string
): Promise<string> {
    let buyerId: string;
    let sellerId: string;

    if (ad.adType === 'buy') {
        buyerId = ad.userId;
        sellerId = initiatorId;
    } else {
        buyerId = initiatorId;
        sellerId = ad.userId;
    }

    if (buyerId === sellerId) {
        throw new Error("You cannot trade with yourself.");
    }
    
    const sellerWalletRef = doc(db, 'users', sellerId, 'wallets', ad.crypto);
    const buyerDocRef = doc(db, 'users', buyerId);
    const sellerDocRef = doc(db, 'users', sellerId);
    const newTradeRef = doc(collection(db, 'trades'));

  try {
    const newTradeId = await runTransaction(db, async (transaction) => {
        const [sellerWalletDoc, buyerDoc, sellerDoc] = await Promise.all([
            transaction.get(sellerWalletRef),
            transaction.get(buyerDocRef),
            transaction.get(sellerDocRef)
        ]);

      if (!sellerWalletDoc.exists()) {
        throw new Error(`Seller's ${ad.crypto} wallet does not exist.`);
      }
       if (!buyerDoc.exists()) {
        throw new Error("Buyer's profile does not exist.");
      }
      if (!sellerDoc.exists()) {
        throw new Error("Seller's profile does not exist.");
      }
      const buyerData = buyerDoc.data() as AppUser;
      const sellerData = sellerDoc.data() as AppUser;


      const sellerWallet = sellerWalletDoc.data() as UserWallet;
      if ((sellerWallet.balance || 0) < cryptoAmount) {
        throw new Error('Seller has insufficient funds.');
      }

      const newSellerBalance = (sellerWallet.balance || 0) - cryptoAmount;
      const newSellerLockedBalance = (sellerWallet.lockedBalance || 0) + cryptoAmount;
      transaction.update(sellerWalletRef, {
        balance: newSellerBalance,
        lockedBalance: newSellerLockedBalance,
        updatedAt: new Date().toISOString(),
      });
      
      const cryptoFee = cryptoAmount * 0.01;

      const newTrade: Omit<Trade, 'id'> = {
        tradeId: generateId("T-", 8),
        adId: ad.id,
        buyerId: buyerId,
        sellerId: sellerId,
        crypto: ad.crypto,
        amount: cryptoAmount,
        escrowFee: cryptoFee,
        fiatCurrency: ad.fiatCurrency,
        fiatAmount: fiatAmount,
        fiatAmountInUSD: fiatAmountInUSD,
        paymentMethod: paymentMethod,
        price: fiatAmount / cryptoAmount,
        status: 'active',
        claimedByBuyer: false,
        createdAt: new Date().toISOString(),
        expiresAt: add(new Date(), { minutes: ad.paymentTimeLimit || 30 }).toISOString(),
        buyer: { 
          username: buyerData.userId, 
          ...(buyerData.country && { country: buyerData.country })
        },
        seller: { 
            username: sellerData.userId, 
            ...(sellerData.country && { country: sellerData.country })
        }
      };

      const buyerNotificationRef = doc(collection(db, 'users', buyerId, 'notifications'));
      transaction.set(buyerNotificationRef, {
          userId: buyerId,
          message: `You have a new trade (${newTrade.tradeId}) with ${sellerData.userId}.`,
          link: `/trade/${newTradeRef.id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
      });

      const sellerNotificationRef = doc(collection(db, 'users', sellerId, 'notifications'));
      transaction.set(sellerNotificationRef, {
          userId: sellerId,
          message: `You have a new trade (${newTrade.tradeId}) with ${buyerData.userId}.`,
          link: `/trade/${newTradeRef.id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
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

export async function markTradeAsPaid(db: Firestore, tradeId: string) {
    const tradeRef = doc(db, 'trades', tradeId);
    
    await runTransaction(db, async (transaction) => {
        const tradeDoc = await transaction.get(tradeRef);
        if (!tradeDoc.exists()) throw new Error("Trade not found.");

        const tradeData = tradeDoc.data() as Trade;
        if (tradeData.status !== 'active') throw new Error("Trade is not active.");

        transaction.update(tradeRef, {
            status: 'paid',
            paidAt: new Date().toISOString()
        });

        const messagesCollectionRef = collection(db, 'trades', tradeId, 'messages');
        const systemMessage = {
          tradeId: tradeId,
          senderId: 'system',
          senderUsername: 'System',
          message: `Buyer has marked the trade as Paid. Kindly check and release the payment only after you have received the funds. Be aware of fake screenshots. Always confirm the payment in your bank account before releasing the crypto.`,
          isModerator: true,
          createdAt: new Date().toISOString(),
        };
        transaction.set(doc(messagesCollectionRef), systemMessage);

        const sellerNotificationRef = doc(collection(db, 'users', tradeData.sellerId, 'notifications'));
        transaction.set(sellerNotificationRef, {
            userId: tradeData.sellerId,
            message: `Buyer has marked trade ${tradeData.tradeId} as paid. Please confirm payment and release funds.`,
            link: `/trade/${tradeId}`,
            isRead: false,
            createdAt: new Date().toISOString(),
        });
    });
}

export async function addReceiptToTrade(db: Firestore, tradeId: string, receiptUrl: string) {
    const tradeRef = doc(db, 'trades', tradeId);
    await updateDoc(tradeRef, {
        paymentReceiptUrl: receiptUrl
    });
}

export async function releaseFundsFromEscrow(db: Firestore, tradeId: string) {
  const tradeRef = doc(db, 'trades', tradeId);
  
  await runTransaction(db, async (transaction) => {
    const tradeDoc = await transaction.get(tradeRef);
    if (!tradeDoc.exists()) throw new Error("Trade not found.");
    
    const trade = tradeDoc.data() as Trade;
    if (trade.status !== 'paid' && trade.status !== 'disputed') throw new Error("This trade is not ready for release.");

    const sellerWalletRef = doc(db, 'users', trade.sellerId, 'wallets', trade.crypto);

    const sellerWalletDoc = await transaction.get(sellerWalletRef);
    if (!sellerWalletDoc.exists()) throw new Error("Seller wallet not found.");

    const sellerWallet = sellerWalletDoc.data() as UserWallet;
    if ((sellerWallet.lockedBalance || 0) < trade.amount) {
        throw new Error("Seller has insufficient locked funds. Critical error.");
    }
    
    transaction.update(sellerWalletRef, {
        lockedBalance: (sellerWallet.lockedBalance || 0) - trade.amount,
        updatedAt: new Date().toISOString(),
    });

    transaction.update(tradeRef, {
      status: 'released',
      releasedAt: new Date().toISOString()
    });

    const buyerNotificationRef = doc(collection(db, 'users', trade.buyerId, 'notifications'));
    transaction.set(buyerNotificationRef, {
        userId: trade.buyerId,
        message: `Seller has released crypto for trade ${trade.tradeId}. Funds are on their way to your wallet.`,
        link: `/trade/${trade.id}`,
        isRead: false,
        createdAt: new Date().toISOString(),
    });
  });
}

export async function claimFundsForTrade(db: Firestore, trade: Trade, buyerId: string, fiatAmountInUSD: number) {
  const tradeRef = doc(db, 'trades', trade.id);
  const messagesCollectionRef = collection(db, 'trades', trade.id, 'messages');

  await runTransaction(db, async (transaction) => {
    const tradeDoc = await transaction.get(tradeRef);
    if (!tradeDoc.exists()) throw new Error("Trade not found.");
    const currentTrade = tradeDoc.data() as Trade;

    if (currentTrade.status !== 'released') throw new Error("Funds have not been released by the seller.");
    if (currentTrade.buyerId !== buyerId) throw new Error("You are not the buyer of this trade.");
    if (currentTrade.claimedByBuyer) return;
    
    const buyerWalletRef = doc(db, 'users', buyerId, 'wallets', currentTrade.crypto);
    const buyerUserRef = doc(db, 'users', buyerId);
    const sellerUserRef = doc(db, 'users', currentTrade.sellerId);
    const sellerNotificationRef = doc(collection(db, 'users', currentTrade.sellerId, 'notifications'));

    const [buyerWalletDoc, buyerUserDoc, sellerUserDoc] = await Promise.all([
      transaction.get(buyerWalletRef),
      transaction.get(buyerUserRef),
      transaction.get(sellerUserRef),
    ]);
    
    const fee = currentTrade.escrowFee || (currentTrade.amount * 0.01);
    const amountToBuyer = currentTrade.amount - fee;

    const walletData = buyerWalletDoc.data() as UserWallet | undefined;
    const currentBalance = walletData?.balance || 0;
    const currentLockedBalance = walletData?.lockedBalance || 0;
    
    transaction.set(buyerWalletRef, {
        balance: currentBalance + amountToBuyer,
        lockedBalance: currentLockedBalance,
        crypto: currentTrade.crypto,
        userId: buyerId,
        id: currentTrade.crypto,
        updatedAt: new Date().toISOString(),
    }, { merge: true });

    transaction.update(tradeRef, { 
        claimedByBuyer: true,
        fiatAmountInUSD: fiatAmountInUSD
    });

    if (buyerUserDoc.exists()) {
        const buyerData = buyerUserDoc.data() as AppUser;
        transaction.update(buyerUserRef, {
            completedTrades: (buyerData.completedTrades || 0) + 1,
            tradeVolume: (buyerData.tradeVolume || 0) + (fiatAmountInUSD || 0),
            lastTradeAt: new Date().toISOString(),
        });
    }
     if (sellerUserDoc.exists()) {
        const sellerData = sellerUserDoc.data() as AppUser;
        transaction.update(sellerUserRef, {
            completedTrades: (sellerData.completedTrades || 0) + 1,
            tradeVolume: (sellerData.tradeVolume || 0) + (fiatAmountInUSD || 0),
            lastTradeAt: new Date().toISOString(),
        });
    }

    const ledgerRef = doc(collection(db, "escrow_ledger"));
    transaction.set(ledgerRef, {
        tradeId: currentTrade.tradeId,
        feeAmount: fee,
        crypto: currentTrade.crypto,
        createdAt: new Date().toISOString()
    });

    transaction.set(sellerNotificationRef, {
        userId: currentTrade.sellerId,
        message: `Trade ${currentTrade.tradeId} is complete. Funds have been claimed by the buyer.`,
        link: `/trade/${currentTrade.id}`,
        isRead: false,
        createdAt: new Date().toISOString(),
    });

    const systemMessage = {
      tradeId: currentTrade.id,
      senderId: 'system',
      senderUsername: 'System',
      message: 'Congratulations! The trade is completed.',
      isModerator: true,
      createdAt: new Date().toISOString(),
    };
    transaction.set(doc(messagesCollectionRef), systemMessage);
  });
}


export async function cancelTrade(db: Firestore, trade: Trade, reason: string) {
  const tradeRef = doc(db, 'trades', trade.id);

  await runTransaction(db, async (transaction) => {
    const liveTradeDoc = await transaction.get(tradeRef);
    if (!liveTradeDoc.exists()) throw new Error("Trade not found.");
    
    const liveTrade = liveTradeDoc.data() as Trade;
    if (["released", "cancelled", "expired"].includes(liveTrade.status)) return;
    
    if (['active', 'paid', 'disputed'].includes(liveTrade.status)) {
      const sellerWalletRef = doc(db, "users", liveTrade.sellerId, "wallets", liveTrade.crypto);
      const sellerWalletDoc = await transaction.get(sellerWalletRef);

      if (sellerWalletDoc.exists()) {
        const sellerWallet = sellerWalletDoc.data() as UserWallet;
        if ((sellerWallet.lockedBalance || 0) >= liveTrade.amount) {
          transaction.update(sellerWalletRef, {
            balance: (sellerWallet.balance || 0) + liveTrade.amount,
            lockedBalance: (sellerWallet.lockedBalance || 0) - liveTrade.amount,
            updatedAt: new Date().toISOString(),
          });
        } else {
            console.error(`Critical Error: Insufficient locked balance for seller ${liveTrade.sellerId} to cancel trade ${liveTrade.id}`);
        }
      } else {
         console.error(`Critical Error: Seller wallet for ${liveTrade.crypto} not found for trade ${liveTrade.id}`);
      }
    }

    transaction.update(tradeRef, { 
        status: "cancelled",
        cancellationReason: reason,
    });
  });
}

export async function sendCoinToUser(
  db: Firestore,
  sender: { uid: string; displayName: string | null },
  recipientUsername: string,
  crypto: CryptoCurrency,
  amount: number
): Promise<string> {
  if (sender.displayName === recipientUsername) throw new Error("You cannot send coins to yourself.");
  if (amount <= 0) throw new Error("Amount must be a positive number.");

  const usersCollectionRef = collection(db, "users");
  const recipientQuery = query(
    usersCollectionRef,
    where("userId", "==", recipientUsername),
    limit(1)
  );
  
  const recipientSnapshot = await getDocs(recipientQuery);
  if (recipientSnapshot.empty) throw new Error(`User "${recipientUsername}" not found.`);
  const recipientDoc = recipientSnapshot.docs[0];
  const recipient = { id: recipientDoc.id, ...(recipientDoc.data() as AppUser) };
  
  const senderWalletRef = doc(db, "users", sender.uid, "wallets", crypto);
  const recipientWalletRef = doc(db, "users", recipient.id, "wallets", crypto);
  const transferRef = doc(collection(db, "transfers"));
  
  let transferId = "";

  await runTransaction(db, async (transaction) => {
    // --- READ PHASE ---
    const senderWalletDoc = await transaction.get(senderWalletRef);
    const recipientWalletDoc = await transaction.get(recipientWalletRef);

    if (!senderWalletDoc.exists() || (senderWalletDoc.data()?.balance || 0) < amount) {
        throw new Error(`Insufficient ${crypto} balance to complete the transfer.`);
    }
    const senderWallet = senderWalletDoc.data() as UserWallet;

    // --- WRITE PHASE ---
    
    // 1. Debit sender's wallet
    transaction.update(senderWalletRef, {
        balance: senderWallet.balance - amount,
        updatedAt: new Date().toISOString()
    });

    // 2. Credit recipient's wallet
    if (recipientWalletDoc.exists()) {
      const recipientWallet = recipientWalletDoc.data() as UserWallet;
      transaction.update(recipientWalletRef, {
        balance: (recipientWallet.balance || 0) + amount,
        updatedAt: new Date().toISOString(),
      });
    } else {
      transaction.set(recipientWalletRef, {
        id: crypto,
        userId: recipient.id,
        crypto: crypto,
        balance: amount,
        lockedBalance: 0,
        updatedAt: new Date().toISOString(),
      });
    }

    // 3. Create transfer log
    transferId = generateId("TX-", 10);
    transaction.set(transferRef, {
      publicId: transferId,
      senderId: sender.uid,
      recipientId: recipient.id,
      senderUsername: sender.displayName,
      recipientUsername: recipient.userId,
      crypto,
      amount,
      createdAt: new Date().toISOString(),
    });
  });

  return transferId;
}


/**
 * Creates a new deposit request document.
 */
export async function createDepositRequest(
  db: Firestore,
  userId: string,
  userDisplayName: string,
  walletIndex: number,
  crypto: CryptoCurrency,
  chain: string,
  amount: number
): Promise<Deposit> {
  if (amount <= 0) {
    throw new Error("Deposit amount must be positive.");
  }

  // Determine the address ID based on the user's assigned walletIndex
  const addressSetId = ((walletIndex - 1) % 20) + 1;
  const addressDocRef = doc(db, "crypto_deposit_addresses", String(addressSetId));
  
  const addressDoc = await getDoc(addressDocRef);
  if (!addressDoc.exists()) {
    throw new Error(`Deposit address set #${addressSetId} is not configured by the admin.`);
  }

  const addresses = addressDoc.data()?.addresses;
  const addressKey = `${crypto}-${chain}`;
  const depositAddress = addresses?.[addressKey];

  if (!depositAddress) {
    throw new Error(`Deposit address for ${crypto} on ${chain} is not configured in set #${addressSetId}.`);
  }

  const newDeposit: Omit<Deposit, 'id'> = {
    userId,
    userDisplayName,
    crypto,
    chain,
    amount,
    walletAddress: depositAddress,
    status: 'pending',
    createdAt: new Date().toISOString(),
    timerEnd: add(new Date(), { hours: 3 }).toISOString(),
    walletIndex: walletIndex,
  };

  const depositCollectionRef = collection(db, 'deposits');
  const newDocRef = await addDoc(depositCollectionRef, newDeposit);

  return { ...newDeposit, id: newDocRef.id };
}

/**
 * Updates a pending deposit with a transaction hash, moving it to 'awaiting_confirmation'.
 */
export async function confirmDepositWithTxId(db: Firestore, depositId: string, txId: string): Promise<void> {
  if (!txId.trim()) {
    throw new Error("Transaction Hash cannot be empty.");
  }
  const depositRef = doc(db, "deposits", depositId);

  await runTransaction(db, async (transaction) => {
    const depositDoc = await transaction.get(depositRef);
    if (!depositDoc.exists()) {
      throw new Error("Deposit request not found.");
    }
    const depositData = depositDoc.data() as Deposit;
    if (depositData.status !== 'pending') {
      throw new Error("This deposit is no longer awaiting payment confirmation.");
    }
    if (isPast(toDate(depositData.timerEnd)!)) {
      transaction.update(depositRef, { status: 'expired' });
      throw new Error("This deposit request has expired.");
    }
    transaction.update(depositRef, {
      status: 'awaiting_confirmation',
      txId: txId
    });
  });
}

export async function createWithdrawalRequest(
    db: Firestore,
    user: AppUser,
    crypto: CryptoCurrency,
    chain: string,
    amount: number,
    address: string,
    fee: number
): Promise<void> {
    const withdrawalRef = doc(collection(db, "users", user.id, "withdrawals"));
    const walletRef = doc(db, "users", user.id, "wallets", crypto);

    await runTransaction(db, async (transaction) => {
        // --- READ PHASE ---
        const walletDoc = await transaction.get(walletRef);

        if (!walletDoc.exists() || (walletDoc.data().balance || 0) < amount) {
             throw new Error("Insufficient available balance.");
        }
        const walletData = walletDoc.data() as UserWallet;

        // --- WRITE PHASE ---
        // Debit from available balance and add to locked balance
        transaction.update(walletRef, {
            balance: walletData.balance - amount,
            lockedBalance: (walletData.lockedBalance || 0) + amount,
            updatedAt: new Date().toISOString()
        });
        
        // Create the withdrawal document
        transaction.set(withdrawalRef, {
            userId: user.id,
            userDisplayName: user.displayName,
            crypto,
            chain,
            amount,
            address,
            fee,
            status: 'pending',
            createdAt: new Date().toISOString(),
        });
    });
}

export async function cancelWithdrawalRequest(db: Firestore, userId: string, withdrawalId: string): Promise<void> {
    const withdrawalRef = doc(db, 'users', userId, 'withdrawals', withdrawalId);

    await runTransaction(db, async (transaction) => {
        const withdrawalDoc = await transaction.get(withdrawalRef);
        if (!withdrawalDoc.exists()) {
            throw new Error("Withdrawal request not found.");
        }

        const withdrawal = withdrawalDoc.data() as Withdrawal;
        if (withdrawal.status !== 'pending') {
            throw new Error("Only pending withdrawals can be cancelled.");
        }

        const userWalletRef = doc(db, 'users', userId, 'wallets', withdrawal.crypto);
        
        const walletDoc = await transaction.get(userWalletRef);
        
        const currentBalance = walletDoc.exists() ? (walletDoc.data().balance || 0) : 0;
        const currentLockedBalance = walletDoc.exists() ? (walletDoc.data().lockedBalance || 0) : 0;

        if (currentLockedBalance < withdrawal.amount) {
            console.error(`Inconsistent state: Locked balance (${currentLockedBalance}) is less than withdrawal amount (${withdrawal.amount}) for user ${userId}. Refunding to available balance anyway.`);
        }
        
        // Return funds from locked to available balance
        transaction.set(userWalletRef, {
            id: withdrawal.crypto,
            userId: userId,
            crypto: withdrawal.crypto,
            balance: currentBalance + withdrawal.amount,
            lockedBalance: Math.max(0, currentLockedBalance - withdrawal.amount),
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        // Mark withdrawal as cancelled
        transaction.update(withdrawalRef, { status: "cancelled" });
    });
}

    
