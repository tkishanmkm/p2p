
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
} from 'firebase/firestore';
import type { CryptoCurrency, P2PAd, Trade, UserWallet, User as AppUser, Deposit } from './types';
import { add } from 'date-fns';
import type { User as AuthUser } from 'firebase/auth';
import { toDate } from '@/lib/utils';

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
        // Ad poster wants to buy, so they are the buyer. Initiator is the seller.
        buyerId = ad.userId;
        sellerId = initiatorId;
    } else { // ad.adType === 'sell'
        // Ad poster wants to sell, so they are the seller. Initiator is the buyer.
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
        throw new Error("Seller's wallet does not exist.");
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

      // Lock seller's funds
      const newSellerBalance = (sellerWallet.balance || 0) - cryptoAmount;
      const newSellerLockedBalance = (sellerWallet.lockedBalance || 0) + cryptoAmount;
      transaction.update(sellerWalletRef, {
        balance: newSellerBalance,
        lockedBalance: newSellerLockedBalance,
        updatedAt: new Date().toISOString(),
      });
      
      const cryptoFee = cryptoAmount * 0.01;

      // Create the new trade document
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

      // Create notifications for both users
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

        // Update trade status
        transaction.update(tradeRef, {
            status: 'paid',
            paidAt: new Date().toISOString()
        });

        // Add system message to chat
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

        // Notify seller
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
    
    // Decrement seller's locked balance
    transaction.update(sellerWalletRef, {
        lockedBalance: (sellerWallet.lockedBalance || 0) - trade.amount,
        updatedAt: new Date().toISOString(),
    });

    // Update trade status to released
    transaction.update(tradeRef, {
      status: 'released',
      releasedAt: new Date().toISOString()
    });

     // Notify buyer
    const buyerNotificationRef = doc(collection(db, 'users', trade.buyerId, 'notifications'));
    transaction.set(buyerNotificationRef, {
        userId: trade.buyerId,
        message: `Seller has released crypto for trade ${trade.tradeId}. Funds are on their way to your wallet.`,
        link: `/trade/${tradeId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
    });
  });
}

export async function claimFundsForTrade(db: Firestore, tradeId: string, buyerId: string) {
  const tradeRef = doc(db, 'trades', tradeId);
  const messagesCollectionRef = collection(db, 'trades', tradeId, 'messages');

  await runTransaction(db, async (transaction) => {
    const tradeDoc = await transaction.get(tradeRef);
    if (!tradeDoc.exists()) throw new Error("Trade not found.");
    
    const trade = tradeDoc.data() as Trade;
    if (trade.status !== 'released') throw new Error("Funds have not been released by the seller.");
    if (trade.buyerId !== buyerId) throw new Error("You are not the buyer of this trade.");
    if (trade.claimedByBuyer) throw new Error("Funds have already been claimed.");

    // Construct refs inside the transaction
    const buyerWalletRef = doc(db, 'users', buyerId, 'wallets', trade.crypto);
    const buyerUserRef = doc(db, 'users', buyerId);
    const sellerUserRef = doc(db, 'users', trade.sellerId);
    const sellerNotificationRef = doc(collection(db, 'users', trade.sellerId, 'notifications'));

    const [buyerWalletDoc, buyerUserDoc, sellerUserDoc] = await Promise.all([
      transaction.get(buyerWalletRef),
      transaction.get(buyerUserRef),
      transaction.get(sellerUserRef),
    ]);
    
    const fee = trade.escrowFee || (trade.amount * 0.01);
    const amountToBuyer = trade.amount - fee;

    const walletData = buyerWalletDoc.data() as UserWallet | undefined;
    const currentBalance = walletData?.balance || 0;
    const currentLockedBalance = walletData?.lockedBalance || 0;
    
    // Use set with merge to create or update the wallet
    transaction.set(buyerWalletRef, {
        balance: currentBalance + amountToBuyer,
        lockedBalance: currentLockedBalance,
        crypto: trade.crypto,
        userId: buyerId,
        id: trade.crypto,
        updatedAt: new Date().toISOString(),
    }, { merge: true });

    transaction.update(tradeRef, { claimedByBuyer: true });

    // Update user stats
    if (buyerUserDoc.exists()) {
        const buyerData = buyerUserDoc.data() as AppUser;
        const oldTotalTrades = buyerData.completedTrades || 0;
        let newAvgPaymentTime = buyerData.avgPaymentTime || 0;
        
        const paidDate = toDate(trade.paidAt);
        const createdDate = toDate(trade.createdAt);

        if (paidDate && createdDate) {
            const paymentDuration = (paidDate.getTime() - createdDate.getTime()) / (1000 * 60); // in minutes
            if (paymentDuration > 0) {
                 newAvgPaymentTime = (((buyerData.avgPaymentTime || 0) * oldTotalTrades) + paymentDuration) / (oldTotalTrades + 1);
            }
        }
        transaction.update(buyerUserRef, {
            completedTrades: oldTotalTrades + 1,
            tradeVolume: (buyerData.tradeVolume || 0) + (trade.fiatAmountInUSD || 0),
            lastTradeAt: new Date().toISOString(),
            avgPaymentTime: newAvgPaymentTime,
        });
    }
     if (sellerUserDoc.exists()) {
        const sellerData = sellerUserDoc.data() as AppUser;
        const oldTotalTrades = sellerData.completedTrades || 0;
        let newAvgReleaseTime = sellerData.avgReleaseTime || 0;

        const releasedDate = toDate(trade.releasedAt);
        const paidDate = toDate(trade.paidAt);

        if(releasedDate && paidDate) {
            const releaseDuration = (releasedDate.getTime() - paidDate.getTime()) / (1000 * 60); // in minutes
            if(releaseDuration > 0) {
                newAvgReleaseTime = (((sellerData.avgReleaseTime || 0) * oldTotalTrades) + releaseDuration) / (oldTotalTrades + 1);
            }
        }
        transaction.update(sellerUserRef, {
            completedTrades: oldTotalTrades + 1,
            tradeVolume: (sellerData.tradeVolume || 0) + (trade.fiatAmountInUSD || 0),
            lastTradeAt: new Date().toISOString(),
            avgReleaseTime: newAvgReleaseTime
        });
    }

    // Log the fee to the escrow ledger
    const ledgerRef = doc(collection(db, "escrow_ledger"));
    transaction.set(ledgerRef, {
        tradeId: trade.tradeId,
        feeAmount: fee,
        crypto: trade.crypto,
        createdAt: new Date().toISOString()
    });

    // Notify seller of completion
    transaction.set(sellerNotificationRef, {
        userId: trade.sellerId,
        message: `Trade ${trade.tradeId} is complete. Funds have been claimed by the buyer.`,
        link: `/trade/${trade.id}`,
        isRead: false,
        createdAt: new Date().toISOString(),
    });

    // Add system message to chat
    const systemMessage = {
      tradeId: trade.id,
      senderId: 'system',
      senderUsername: 'System',
      message: 'Congratulations! The trade is completed.',
      isModerator: true,
      createdAt: new Date().toISOString(),
    };
    transaction.set(doc(messagesCollectionRef), systemMessage);
  });
}

/**
 * Cancels a trade, returns funds if appropriate, and logs the reason.
 */
export async function cancelTrade(db: Firestore, tradeId: string, reason: string) {
  const tradeRef = doc(db, "trades", tradeId);

  await runTransaction(db, async (transaction) => {
    const tradeDoc = await transaction.get(tradeRef);
    if (!tradeDoc.exists()) {
      console.warn(`Attempted to cancel non-existent trade: ${tradeId}`);
      return;
    }
    
    const trade = tradeDoc.data() as Trade;
    
    // Only proceed if the trade is not already resolved.
    if (["released", "cancelled", "expired"].includes(trade.status)) {
      console.warn(`Trade ${tradeId} is not in a cancellable state (current: ${trade.status}).`);
      return;
    }
    
    // Only return funds from escrow if the trade was active (not yet paid).
    // If it was paid/disputed, cancellation implies an issue an admin should review, funds are not auto-returned.
    if (trade.status === 'active') {
      const sellerWalletRef = doc(db, "users", trade.sellerId, "wallets", trade.crypto);
      const sellerWalletDoc = await transaction.get(sellerWalletRef);

      if (sellerWalletDoc.exists()) {
        const sellerWallet = sellerWalletDoc.data() as UserWallet;
        if ((sellerWallet.lockedBalance || 0) >= trade.amount) {
          transaction.update(sellerWalletRef, {
            balance: (sellerWallet.balance || 0) + trade.amount,
            lockedBalance: (sellerWallet.lockedBalance || 0) - trade.amount,
            updatedAt: new Date().toISOString(),
          });
        } else {
          console.error(`CRITICAL: Insufficient locked balance for trade cancellation. Trade ID: ${tradeId}, Seller: ${trade.sellerId}`);
        }
      } else {
        console.error(`CRITICAL: Seller wallet not found during trade cancellation. Trade ID: ${tradeId}, Seller: ${trade.sellerId}`);
      }
    }

    // Update trade status and reason
    transaction.update(tradeRef, { 
        status: "cancelled",
        cancellationReason: reason,
    });

    // Add system message to chat
    const messagesCollectionRef = collection(db, 'trades', tradeId, 'messages');
    const systemMessage = {
      tradeId: tradeId,
      senderId: 'system',
      senderUsername: 'System',
      message: `This trade has been cancelled.\nReason: ${reason}\n\nDo not make any payment. If you have already paid, please open a support ticket immediately.`,
      isModerator: true,
      createdAt: new Date().toISOString(),
    };
    transaction.set(doc(messagesCollectionRef), systemMessage);

    // Notify both parties
    const buyerNotificationRef = doc(collection(db, 'users', trade.buyerId, 'notifications'));
    transaction.set(buyerNotificationRef, {
        userId: trade.buyerId,
        message: `Trade ${trade.tradeId} has been cancelled. Reason: ${reason}`,
        link: `/trade/${trade.id}`,
        isRead: false,
        createdAt: new Date().toISOString(),
    });

    const sellerNotificationRef = doc(collection(db, 'users', trade.sellerId, 'notifications'));
    transaction.set(sellerNotificationRef, {
        userId: trade.sellerId,
        message: `Trade ${trade.tradeId} has been cancelled. Your funds of ${trade.amount} ${trade.crypto} have been returned to your wallet.`,
        link: `/trade/${trade.id}`,
        isRead: false,
        createdAt: new Date().toISOString(),
    });
  });
}

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
    if ((wallet.balance || 0) < values.amount) {
      throw new Error("Insufficient available balance.");
    }

    // Move funds from available to locked
    transaction.update(walletRef, {
      balance: (wallet.balance || 0) - values.amount,
      lockedBalance: (wallet.lockedBalance || 0) + values.amount,
      updatedAt: new Date().toISOString(),
    });

    // Create withdrawal request
    const withdrawalCollectionRef = collection(db, "users", user.uid, "withdrawals");
    const newWithdrawalRef = doc(withdrawalCollectionRef); 

    const newWithdrawalData = {
      userId: user.uid,
      userDisplayName: user.displayName || 'Unknown',
      crypto: values.crypto as CryptoCurrency,
      chain: values.chain,
      address: values.address,
      amount: values.amount,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };
    
    transaction.set(newWithdrawalRef, newWithdrawalData);
  });
}

export async function cancelWithdrawal(db: Firestore, withdrawal: Withdrawal): Promise<void> {
    const withdrawalRef = doc(db, "users", withdrawal.userId, "withdrawals", withdrawal.id);
    const walletRef = doc(db, "users", withdrawal.userId, "wallets", withdrawal.crypto);

    await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists()) throw new Error("Wallet not found.");
        
        const wallet = walletDoc.data() as UserWallet;
        if ((wallet.lockedBalance || 0) < withdrawal.amount) {
            throw new Error("Insufficient locked balance to return.");
        }

        // Return funds to available balance
        transaction.update(walletRef, {
            balance: (wallet.balance || 0) + withdrawal.amount,
            lockedBalance: (wallet.lockedBalance || 0) - withdrawal.amount,
            updatedAt: new Date().toISOString(),
        });

        // Update withdrawal status
        transaction.update(withdrawalRef, { status: 'cancelled' });
    });
}

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

  const usersCollectionRef = collection(db, "users");
  const recipientQuery = query(
    usersCollectionRef,
    where("userId", "==", recipientUsername),
    limit(1)
  );
  
  const recipientSnapshot = await getDocs(recipientQuery);
  if (recipientSnapshot.empty) {
    throw new Error(`User "${recipientUsername}" not found.`);
  }
  const recipientDoc = recipientSnapshot.docs[0];
  const recipient = { id: recipientDoc.id, ...(recipientDoc.data() as AppUser) };

  const senderWalletRef = doc(db, "users", sender.uid, "wallets", crypto);
  const recipientWalletRef = doc(db, "users", recipient.id, "wallets", crypto);
  const transferRef = doc(collection(db, "transfers"));
  
  let transferId = "";

  await runTransaction(db, async (transaction) => {
    const senderWalletDoc = await transaction.get(senderWalletRef);
    const recipientWalletDoc = await transaction.get(recipientWalletRef);

    if (!senderWalletDoc.exists() || ((senderWalletDoc.data() as UserWallet).balance || 0) < amount) {
      throw new Error(`Insufficient ${crypto} balance.`);
    }

    const senderWallet = senderWalletDoc.data() as UserWallet;
    transaction.update(senderWalletRef, {
      balance: (senderWallet.balance || 0) - amount,
      updatedAt: new Date().toISOString(),
    });

    if (recipientWalletDoc.exists()) {
      const recipientWallet = recipientWalletDoc.data() as UserWallet;
      transaction.update(recipientWalletRef, {
        balance: (recipientWallet.balance || 0) + amount,
        updatedAt: new Date().toISOString(),
      });
    } else {
      transaction.set(recipientWalletRef, {
        balance: amount,
        lockedBalance: 0,
        crypto,
        userId: recipient.id,
        id: crypto,
        updatedAt: new Date().toISOString(),
      });
    }

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

    const senderNotifRef = doc(collection(db, `users/${sender.uid}/notifications`));
    transaction.set(senderNotifRef, {
      userId: sender.uid,
      message: `You sent ${amount} ${crypto} to ${recipientUsername}.`,
      isRead: false,
      createdAt: new Date().toISOString(),
      link: `/transfer`,
    });

    const recipientNotifRef = doc(collection(db, `users/${recipient.id}/notifications`));
    transaction.set(recipientNotifRef, {
        userId: recipient.id,
        message: `You have received ${amount} ${crypto} from ${sender.displayName}.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        link: `/transfer`,
    });
  });

  return transferId;
}

/**
 * Automatically processes a deposit after user confirmation.
 */
export async function processAutomatedDeposit(
  db: Firestore,
  deposit: Deposit
): Promise<void> {
  const depositRef = doc(db, "deposits", deposit.id);
  const userWalletRef = doc(db, "users", deposit.userId, "wallets", deposit.crypto);
  const notificationRef = doc(collection(db, "users", deposit.userId, "notifications"));

  await runTransaction(db, async (transaction) => {
    const depositDoc = await transaction.get(depositRef);
    if (!depositDoc.exists() || depositDoc.data().status !== 'awaiting_confirmation') {
      throw new Error('Deposit is not in a state to be processed.');
    }

    const walletDoc = await transaction.get(userWalletRef);
    let newBalance = deposit.amount;

    if (walletDoc.exists()) {
      const walletData = walletDoc.data() as UserWallet;
      newBalance += (walletData.balance || 0);
    }
    
    // Use set with merge to create or update the wallet
    transaction.set(userWalletRef, {
        balance: newBalance,
        crypto: deposit.crypto,
        userId: deposit.userId,
        id: deposit.crypto,
    }, { merge: true });

    transaction.update(userWalletRef, { updatedAt: new Date().toISOString() });
    
    transaction.update(depositRef, {
      status: "approved",
      finalAmount: deposit.amount,
    });

    transaction.set(notificationRef, {
        userId: deposit.userId,
        message: `Your deposit of ${deposit.amount} ${deposit.crypto} has been confirmed and added to your wallet.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        link: `/wallets`
    });
  });
}
