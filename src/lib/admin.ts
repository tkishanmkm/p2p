

'use client';

import {
  Firestore,
  doc,
  runTransaction,
  writeBatch,
  updateDoc,
  collection,
  arrayRemove,
  setDoc,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import type { CryptoCurrency, Deposit, Dispute, Trade, UserWallet, Withdrawal, SupportTicket, AppUser } from "./types";
import { cancelTrade, markTradeAsPaid, releaseFundsFromEscrow } from "./wallet";
import { CHAINS } from "./constants";

/**
 * Approves a deposit and updates the user's wallet balance in a single transaction.
 */
export async function approveDeposit(
  db: Firestore,
  deposit: Deposit,
  approvedAmount: number,
  adminId: string
): Promise<void> {
  const depositRef = doc(db, "deposits", deposit.id);
  const userWalletRef = doc(db, "users", deposit.userId, "wallets", `${deposit.crypto}-${deposit.chain}`);
  const notificationRef = doc(collection(db, "users", deposit.userId, "notifications"));

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(userWalletRef);
    let newBalance = approvedAmount;
    let currentLockedBalance = 0;

    if (walletDoc.exists()) {
      const walletData = walletDoc.data() as UserWallet;
      newBalance += (walletData.balance || 0);
      currentLockedBalance = walletData.lockedBalance || 0;
    }

    // Use set with merge to safely update or create the wallet
    transaction.set(userWalletRef, {
        balance: newBalance,
        lockedBalance: currentLockedBalance, // Preserve existing locked balance
        crypto: deposit.crypto,
        chain: deposit.chain,
        userId: deposit.userId,
        id: `${deposit.crypto}-${deposit.chain}`,
        updatedAt: new Date().toISOString(),
    }, { merge: true });


    // Mark the deposit as approved
    transaction.update(depositRef, {
      status: "approved",
      finalAmount: approvedAmount,
      adminId: adminId,
    });

    // Notify user
    transaction.set(notificationRef, {
        userId: deposit.userId,
        message: `Your deposit of ${approvedAmount} ${deposit.crypto} has been approved and added to your wallet.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        link: `/wallets`
    })
  });
}

/**
 * Declines a deposit request.
 */
export async function declineDeposit(
  db: Firestore,
  deposit: Deposit,
  adminId: string,
): Promise<void> {
  const depositRef = doc(db, "deposits", deposit.id);
  await updateDoc(depositRef, {
      status: "declined",
      adminId: adminId,
  });
}

/**
 * Approves a withdrawal request. This finalizes the withdrawal.
 */
export async function approveWithdrawal(
  db: Firestore,
  withdrawal: Withdrawal,
  adminId: string
): Promise<void> {
  const withdrawalRef = doc(db, "users", withdrawal.userId, "withdrawals", withdrawal.id);
  const userWalletRef = doc(db, "users", withdrawal.userId, "wallets", `${withdrawal.crypto}-${withdrawal.chain}`);
  const notificationRef = doc(collection(db, "users", withdrawal.userId, "notifications"));

  await runTransaction(db, async (transaction) => {
    const withdrawalDoc = await transaction.get(withdrawalRef);
    if (!withdrawalDoc.exists() || withdrawalDoc.data().status !== 'pending') {
      throw new Error("Withdrawal is not pending or does not exist.");
    }
    
    const walletDoc = await transaction.get(userWalletRef);
    if (!walletDoc.exists()) {
      throw new Error("User wallet not found. Critical error.");
    }
    
    const wallet = walletDoc.data() as UserWallet;
    if ((wallet.lockedBalance || 0) < withdrawal.amount) {
      throw new Error("Insufficient locked balance. Critical error.");
    }

    // Deduct from locked balance, preserving available balance
    transaction.update(userWalletRef, {
      balance: wallet.balance || 0, // Preserve available balance
      lockedBalance: (wallet.lockedBalance || 0) - withdrawal.amount,
      updatedAt: new Date().toISOString(),
    });

    // Mark withdrawal as approved
    transaction.update(withdrawalRef, {
      status: "approved",
      adminId: adminId,
    });

     // Notify user
    transaction.set(notificationRef, {
        userId: withdrawal.userId,
        message: `Your withdrawal of ${withdrawal.amount} ${withdrawal.crypto} has been approved and processed.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        link: `/wallets`
    });
  });
}

/**
 * Declines a withdrawal request and returns funds to the user's available balance.
 */
export async function declineWithdrawal(
  db: Firestore,
  withdrawal: Withdrawal,
  adminId: string
): Promise<void> {
    const withdrawalRef = doc(db, "users", withdrawal.userId, "withdrawals", withdrawal.id);
    const userWalletRef = doc(db, "users", withdrawal.userId, "wallets", `${withdrawal.crypto}-${withdrawal.chain}`);
    const notificationRef = doc(collection(db, "users", withdrawal.userId, "notifications"));

    await runTransaction(db, async (transaction) => {
        const withdrawalDoc = await transaction.get(withdrawalRef);
        if (!withdrawalDoc.exists() || withdrawalDoc.data().status !== 'pending') {
            throw new Error("Withdrawal is not pending or does not exist.");
        }

        const walletDoc = await transaction.get(userWalletRef);
        if (!walletDoc.exists()) {
            throw new Error("User wallet not found. Critical error.");
        }

        const wallet = walletDoc.data() as UserWallet;
        if ((wallet.lockedBalance || 0) < withdrawal.amount) {
            throw new Error("Insufficient locked balance to return. Critical error.");
        }

        // Return funds from locked to available balance
        transaction.update(userWalletRef, {
            balance: (wallet.balance || 0) + withdrawal.amount,
            lockedBalance: (wallet.lockedBalance || 0) - withdrawal.amount,
            updatedAt: new Date().toISOString(),
        });

        // Mark withdrawal as declined
        transaction.update(withdrawalRef, {
            status: "declined",
            adminId: adminId,
        });

        // Notify user
        transaction.set(notificationRef, {
            userId: withdrawal.userId,
            message: `Your withdrawal of ${withdrawal.amount} ${withdrawal.crypto} was declined and the funds returned to your wallet.`,
            isRead: false,
            createdAt: new Date().toISOString(),
            link: `/wallets`
        });
    });
}

export async function setUserBanStatus(db: Firestore, userId: string, userDisplayName: string, isBanned: boolean, adminId: string, reason: string) {
  const userRef = doc(db, "users", userId);
  const adminLogRef = doc(collection(db, "admin_logs"));
  const notificationRef = doc(collection(db, "users", userId, "notifications"));

  const batch = writeBatch(db);

  batch.update(userRef, { isBanned });

  const actionMessage = isBanned ? `Banned user ${userDisplayName}. Reason: ${reason}` : `Unbanned user ${userDisplayName}. Reason: ${reason}`;
  batch.set(adminLogRef, {
    adminId,
    action: actionMessage,
    targetId: userId,
    createdAt: new Date().toISOString(),
  });

  const notificationMessage = isBanned ? `Your account has been banned. Reason: ${reason}` : `The ban on your account has been lifted. Reason: ${reason}`;
  batch.set(notificationRef, {
    userId,
    message: notificationMessage,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await batch.commit();
}

export async function setUserHoldStatus(db: Firestore, userId: string, userDisplayName: string, isOnHold: boolean, adminId: string, reason: string) {
  const userRef = doc(db, "users", userId);
  const adminLogRef = doc(collection(db, "admin_logs"));
  const notificationRef = doc(collection(db, "users", userId, "notifications"));

  const batch = writeBatch(db);

  batch.update(userRef, { isOnHold });

  const actionMessage = isOnHold ? `Placed account of ${userDisplayName} on hold. Reason: ${reason}` : `Removed hold on account of ${userDisplayName}. Reason: ${reason}`;
  batch.set(adminLogRef, {
    adminId,
    action: actionMessage,
    targetId: userId,
    createdAt: new Date().toISOString(),
  });

  const notificationMessage = isOnHold ? `Your account has been placed on hold. Reason: ${reason}` : `The hold on your account has been removed. Reason: ${reason}`;
  batch.set(notificationRef, {
    userId,
    message: notificationMessage,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  await batch.commit();
}

export async function resolveDispute(
  db: Firestore, 
  trade: Trade, 
  dispute: Dispute, 
  winnerId: string, 
  adminId: string,
  fiatAmountInUSD: number
) {
  const tradeRef = doc(db, "trades", trade.id);
  const disputeRef = doc(db, "trades", trade.id, "disputes", dispute.id);
  
  const sellerWalletId = `${trade.crypto}-${trade.chain}`;
  const sellerWalletRef = doc(db, "users", trade.sellerId, "wallets", sellerWalletId);
  const messagesCollectionRef = collection(db, 'trades', trade.id, 'messages');

  return runTransaction(db, async (transaction) => {
    const sellerWalletDoc = await transaction.get(sellerWalletRef);
    if (!sellerWalletDoc.exists()) throw new Error("Seller wallet not found.");
    const sellerWallet = sellerWalletDoc.data() as UserWallet;

    const winnerUsername = winnerId === trade.buyerId ? trade.buyer.username : trade.seller.username;
    let finalTradeStatus: 'cancelled' | 'released';
    let systemMessageText: string;

    if (winnerId === trade.sellerId) {
      // Logic for when SELLER wins: Cancel the trade and return funds from escrow
      finalTradeStatus = 'cancelled';
      if ((sellerWallet.lockedBalance || 0) < trade.amount) throw new Error("Insufficient locked funds to return.");
      transaction.update(sellerWalletRef, {
        balance: (sellerWallet.balance || 0) + trade.amount,
        lockedBalance: (sellerWallet.lockedBalance || 0) - trade.amount,
        updatedAt: new Date().toISOString()
      });
      transaction.update(tradeRef, { status: finalTradeStatus });
      systemMessageText = `Dispute resolved. The trade has been awarded to the seller (${winnerUsername}) and is now cancelled.`;

    } else { // Winner is BUYER: Release the funds fully to them
      finalTradeStatus = 'released';
      
      const buyerWalletId = `${trade.crypto}-${trade.chain}`;
      const buyerWalletRef = doc(db, 'users', trade.buyerId, 'wallets', buyerWalletId);
      const buyerUserRef = doc(db, 'users', trade.buyerId);
      const sellerUserRef = doc(db, 'users', trade.sellerId);
      
      const [buyerWalletDoc, buyerUserDoc, sellerUserDoc] = await Promise.all([
          transaction.get(buyerWalletRef),
          transaction.get(buyerUserRef),
          transaction.get(sellerUserRef),
      ]);

      // 1. Decrement seller's locked balance
      if ((sellerWallet.lockedBalance || 0) < trade.amount) throw new Error("Insufficient locked funds to release.");
      transaction.update(sellerWalletRef, {
        lockedBalance: (sellerWallet.lockedBalance || 0) - trade.amount,
        updatedAt: new Date().toISOString()
      });
      
      // 2. Calculate fees and credit buyer
      const fee = trade.escrowFee || (trade.amount * 0.01);
      const amountToBuyer = trade.amount - fee;
      const walletData = buyerWalletDoc.data() as UserWallet | undefined;
      transaction.set(buyerWalletRef, {
        balance: (walletData?.balance || 0) + amountToBuyer,
        lockedBalance: (walletData?.lockedBalance || 0),
        crypto: trade.crypto,
        chain: trade.chain,
        userId: trade.buyerId,
        id: buyerWalletId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // 3. Log escrow fee
      const ledgerRef = doc(collection(db, "escrow_ledger"));
      transaction.set(ledgerRef, {
          tradeId: trade.tradeId,
          feeAmount: fee,
          crypto: trade.crypto,
          createdAt: new Date().toISOString()
      });

      // 4. Update stats for both users
      if (buyerUserDoc.exists()) transaction.update(buyerUserRef, {
          completedTrades: (buyerUserDoc.data().completedTrades || 0) + 1,
          tradeVolume: (buyerUserDoc.data().tradeVolume || 0) + fiatAmountInUSD,
          lastTradeAt: new Date().toISOString(),
      });
       if (sellerUserDoc.exists()) transaction.update(sellerUserRef, {
          completedTrades: (sellerUserDoc.data().completedTrades || 0) + 1,
          tradeVolume: (sellerUserDoc.data().tradeVolume || 0) + fiatAmountInUSD,
          lastTradeAt: new Date().toISOString(),
      });

      // 5. Update trade status and backfill fiatAmountInUSD if it was missing
      transaction.update(tradeRef, { 
          status: finalTradeStatus, 
          releasedAt: new Date().toISOString(),
          claimedByBuyer: true, // Mark as claimed since admin did it
          fiatAmountInUSD: fiatAmountInUSD,
      });

      systemMessageText = `Dispute resolved. The trade has been awarded to the buyer (${winnerUsername}) and is now completed.`;
    }

    // Update dispute doc
    transaction.update(disputeRef, {
      status: "resolved",
      winnerId: winnerId,
      resolvedBy: adminId,
      resolutionNote: `Dispute awarded to ${winnerUsername} by moderator.`,
    });

    // Add system message
    transaction.set(doc(messagesCollectionRef), {
      tradeId: trade.id,
      senderId: 'system',
      senderUsername: 'System',
      message: systemMessageText,
      isModerator: true,
      createdAt: new Date().toISOString(),
    });

    // Add notifications
    const opponentId = winnerId === trade.buyerId ? trade.sellerId : trade.buyerId;

    const winnerNotifRef = doc(collection(db, 'users', winnerId, 'notifications'));
    const winnerMessage = finalTradeStatus === 'released'
        ? `Congratulations! You have won the dispute for trade ${trade.tradeId}. The crypto has been added to your wallet.`
        : `You have won the dispute for trade ${trade.tradeId}. The trade has been cancelled.`;
    transaction.set(winnerNotifRef, {
        userId: winnerId,
        message: winnerMessage,
        link: `/trade/${trade.id}`,
        isRead: false,
        createdAt: new Date().toISOString(),
    });

    const loserNotifRef = doc(collection(db, 'users', opponentId, 'notifications'));
    const loserMessage = `The dispute for trade ${trade.tradeId} has been resolved in favor of the other party. The trade is now ${finalTradeStatus === 'released' ? 'completed' : 'cancelled'}.`;
    transaction.set(loserNotifRef, {
        userId: opponentId,
        message: loserMessage,
        link: `/trade/${trade.id}`,
        isRead: false,
        createdAt: new Date().toISOString(),
    });
  });
}

export async function updateSupportTicketStatus(db: Firestore, ticketId: string, status: SupportTicket['status'], note?: string) {
  const ticketRef = doc(db, "support_tickets", ticketId);
  const updateData: { status: SupportTicket['status'], resolutionNote?: string } = { status };
  if (note) {
    updateData.resolutionNote = note;
  }
  await updateDoc(ticketRef, updateData);
}

/**
 * Manually adjusts a user's wallet balance.
 * Creates a wallet if it doesn't exist for an 'add' operation.
 * Logs the action to the admin logs.
 */
export async function adjustUserWalletBalance(
  db: Firestore,
  adminId: string,
  userId: string,
  userDisplayName: string,
  crypto: CryptoCurrency,
  action: 'add' | 'subtract',
  amount: number,
  reason: string
): Promise<void> {
  if (amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  // This function needs to know the chain. We'll assume the first available chain.
  const chain = CHAINS[crypto]?.[0];
  if (!chain) {
    throw new Error(`No chain configured for ${crypto}.`);
  }

  const userWalletRef = doc(db, "users", userId, "wallets", `${crypto}-${chain}`);
  const adminLogRef = doc(collection(db, "admin_logs"));
  const notificationRef = doc(collection(db, "users", userId, "notifications"));

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(userWalletRef);
    let currentBalance = 0;
    let currentLockedBalance = 0;

    if (walletDoc.exists()) {
      const walletData = walletDoc.data() as UserWallet;
      currentBalance = (walletData.balance || 0);
      currentLockedBalance = (walletData.lockedBalance || 0);
    }

    let newBalance: number;
    if (action === 'add') {
      newBalance = currentBalance + amount;
    } else { // subtract
      newBalance = currentBalance - amount;
      if (newBalance < 0) {
        throw new Error("Cannot subtract more than the available balance.");
      }
    }

    // Set or Update the wallet
    transaction.set(userWalletRef, {
      id: `${crypto}-${chain}`,
      userId: userId,
      crypto: crypto,
      chain: chain,
      balance: newBalance,
      lockedBalance: currentLockedBalance, // Don't touch locked balance
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Create a log entry for this action
    transaction.set(adminLogRef, {
      adminId: adminId,
      action: `Adjusted ${userDisplayName}'s ${crypto} balance. Action: ${action}, Amount: ${amount}. Reason: ${reason}`,
      targetId: userId,
      createdAt: new Date().toISOString(),
    });

     // Create user notification
    const notificationMessage = `An admin has adjusted your ${crypto} wallet balance. Action: ${action}, Amount: ${amount}. Reason: ${reason}`;
    transaction.set(notificationRef, {
        userId,
        message: notificationMessage,
        isRead: false,
        createdAt: new Date().toISOString(),
        link: '/wallets'
    });
  });
}

/**
 * Allows an administrator to remove a user from another user's block list.
 * @param db The Firestore instance.
 * @param ownerUserId The UID of the user whose block list is being modified.
 * @param targetUserIdToUnblock The UID of the user to remove from the block list.
 */
export async function adminUnblockUser(
  db: Firestore,
  ownerUserId: string,
  targetUserIdToUnblock: string
): Promise<void> {
  const userRef = doc(db, "users", ownerUserId);
  await updateDoc(userRef, {
    blockedUsers: arrayRemove(targetUserIdToUnblock)
  });
}

export async function adminCancelTrade(db: Firestore, trade: Trade, adminId: string, reason: string) {
    const fullReason = `Cancelled by administrator. Reason: ${reason}`;
    await cancelTrade(db, trade, fullReason);
    const adminLogRef = doc(collection(db, "admin_logs"));
    await setDoc(adminLogRef, {
        adminId,
        action: `Admin cancelled trade ${trade.tradeId}. Reason: ${reason}`,
        targetId: trade.id,
        createdAt: new Date().toISOString(),
    });
}

export async function adminMarkTradeAsPaid(db: Firestore, trade: Trade, adminId: string, reason: string) {
    await markTradeAsPaid(db, trade.id);
    const adminLogRef = doc(collection(db, "admin_logs"));
    await setDoc(adminLogRef, {
        adminId,
        action: `Admin marked trade ${trade.tradeId} as paid. Reason: ${reason}`,
        targetId: trade.id,
        createdAt: new Date().toISOString(),
    });
}

export async function adminReleaseFunds(db: Firestore, trade: Trade, adminId: string, reason: string) {
    await releaseFundsFromEscrow(db, trade.id);
    const adminLogRef = doc(collection(db, "admin_logs"));
    await setDoc(adminLogRef, {
        adminId,
        action: `Admin released funds for trade ${trade.tradeId}. Reason: ${reason}`,
        targetId: trade.id,
        createdAt: new Date().toISOString(),
    });
}
