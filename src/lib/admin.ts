
"use client";

import {
  doc,
  runTransaction,
  writeBatch,
  Firestore,
  updateDoc,
  collection,
  arrayRemove,
  setDoc,
} from "firebase/firestore";
import type { CryptoCurrency, Deposit, Dispute, Trade, UserWallet, Withdrawal, SupportTicket } from "./types";
import { cancelTrade, markTradeAsPaid, releaseFundsFromEscrow } from "./wallet";

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
  const userWalletRef = doc(db, "users", deposit.userId, "wallets", deposit.crypto);
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
        userId: deposit.userId,
        id: deposit.crypto,
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
  const userWalletRef = doc(db, "users", withdrawal.userId, "wallets", withdrawal.crypto);
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
    const userWalletRef = doc(db, "users", withdrawal.userId, "wallets", withdrawal.crypto);
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

export async function resolveDispute(db: Firestore, trade: Trade, dispute: Dispute, winnerId: string, adminId: string) {
  const tradeRef = doc(db, "trades", trade.id);
  const disputeRef = doc(db, "trades", trade.id, "disputes", dispute.id);
  const sellerWalletRef = doc(db, "users", trade.sellerId, "wallets", trade.crypto);
  const messagesCollectionRef = collection(db, 'trades', trade.id, 'messages');

  return runTransaction(db, async (transaction) => {
    const sellerWalletDoc = await transaction.get(sellerWalletRef);
    if (!sellerWalletDoc.exists()) throw new Error("Seller wallet not found.");
    const sellerWallet = sellerWalletDoc.data() as UserWallet;

    const winnerUsername = winnerId === trade.buyerId ? trade.buyer.username : trade.seller.username;
    let finalTradeStatus: 'cancelled' | 'released';

    if (winnerId === trade.sellerId) {
      finalTradeStatus = 'cancelled';
      if ((sellerWallet.lockedBalance || 0) < trade.amount) throw new Error("Insufficient locked funds to return.");
      transaction.update(sellerWalletRef, {
        balance: (sellerWallet.balance || 0) + trade.amount,
        lockedBalance: (sellerWallet.lockedBalance || 0) - trade.amount,
        updatedAt: new Date().toISOString()
      });
      transaction.update(tradeRef, { status: finalTradeStatus });
    } else { // Winner is buyer
      finalTradeStatus = 'released';
      if ((sellerWallet.lockedBalance || 0) < trade.amount) throw new Error("Insufficient locked funds to release.");
      transaction.update(sellerWalletRef, {
        balance: sellerWallet.balance || 0, // Preserve available balance
        lockedBalance: (sellerWallet.lockedBalance || 0) - trade.amount,
        updatedAt: new Date().toISOString()
      });
      transaction.update(tradeRef, { status: finalTradeStatus });
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
      message: `Dispute resolved. The trade has been awarded to ${winnerUsername}. Final trade status: ${finalTradeStatus}.`,
      isModerator: true,
      createdAt: new Date().toISOString(),
    });

    // Add notifications
    const opponentId = winnerId === trade.buyerId ? trade.sellerId : trade.buyerId;

    const winnerNotifRef = doc(collection(db, 'users', winnerId, 'notifications'));
    transaction.set(winnerNotifRef, {
        userId: winnerId,
        message: `You have won the dispute for trade ${trade.tradeId}. The trade is now ${finalTradeStatus}.`,
        link: `/trade/${trade.id}`,
        isRead: false,
        createdAt: new Date().toISOString(),
    });

    const loserNotifRef = doc(collection(db, 'users', opponentId, 'notifications'));
    transaction.set(loserNotifRef, {
        userId: opponentId,
        message: `The dispute for trade ${trade.tradeId} has been resolved in favor of the other party. The trade is now ${finalTradeStatus}.`,
        link: `/trade/${trade.id}`,
        isRead: false,
        createdAt: new Date().toISOString(),
    });
  });
}

export async function updateSupportTicketStatus(db: Firestore, ticketId: string, status: SupportTicket['status']) {
  const ticketRef = doc(db, "support_tickets", ticketId);
  await updateDoc(ticketRef, { status });
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

  const userWalletRef = doc(db, "users", userId, "wallets", crypto);
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
      id: crypto,
      userId: userId,
      crypto: crypto,
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
    await cancelTrade(db, trade.id);
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
