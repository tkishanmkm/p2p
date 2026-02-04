
"use client";

import {
  doc,
  runTransaction,
  writeBatch,
  serverTimestamp,
  Firestore,
  updateDoc,
  collection,
} from "firebase/firestore";
import type { CryptoCurrency, Deposit, Dispute, Trade, UserWallet, Withdrawal, SupportTicket } from "./types";

/**
 * Approves a deposit and updates the user's wallet balance in a single transaction.
 */
export async function approveDeposit(
  db: Firestore,
  deposit: Deposit
): Promise<void> {
  const depositRef = doc(db, "deposits", deposit.id);
  const userWalletRef = doc(db, "users", deposit.userId, "wallets", deposit.crypto);

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(userWalletRef);
    let newBalance = deposit.amount;

    if (walletDoc.exists()) {
      const walletData = walletDoc.data() as UserWallet;
      newBalance += walletData.balance;
      transaction.update(userWalletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Wallet doesn't exist, create it.
      const newWallet: UserWallet = {
        id: deposit.crypto,
        userId: deposit.userId,
        crypto: deposit.crypto,
        balance: newBalance,
        lockedBalance: 0,
        updatedAt: new Date().toISOString(), // This will be replaced by server timestamp on write
      };
      transaction.set(userWalletRef, newWallet);
    }

    // Mark the deposit as approved
    transaction.update(depositRef, {
      status: "approved",
      adminId: "admin_placeholder", // Replace with actual admin ID later
    });
  });
}

/**
 * Declines a deposit request.
 */
export async function declineDeposit(
  db: Firestore,
  deposit: Deposit
): Promise<void> {
  const depositRef = doc(db, "deposits", deposit.id);
  await updateDoc(depositRef, {
      status: "declined",
      adminId: "admin_placeholder",
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
    if (wallet.lockedBalance < withdrawal.amount) {
      throw new Error("Insufficient locked balance. Critical error.");
    }

    // Deduct from locked balance
    transaction.update(userWalletRef, {
      lockedBalance: wallet.lockedBalance - withdrawal.amount,
      updatedAt: serverTimestamp(),
    });

    // Mark withdrawal as approved
    transaction.update(withdrawalRef, {
      status: "approved",
      adminId: adminId,
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
        if (wallet.lockedBalance < withdrawal.amount) {
            throw new Error("Insufficient locked balance to return. Critical error.");
        }

        // Return funds from locked to available balance
        transaction.update(userWalletRef, {
            balance: wallet.balance + withdrawal.amount,
            lockedBalance: wallet.lockedBalance - withdrawal.amount,
            updatedAt: serverTimestamp(),
        });

        // Mark withdrawal as declined
        transaction.update(withdrawalRef, {
            status: "declined",
            adminId: adminId,
        });
    });
}

export async function setUserBanStatus(db: Firestore, userId: string, isBanned: boolean) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { isBanned });
}

export async function setUserHoldStatus(db: Firestore, userId: string, isOnHold: boolean) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { isOnHold });
}

export async function resolveDispute(db: Firestore, trade: Trade, dispute: Dispute, winnerId: string, adminId: string) {
  const tradeRef = doc(db, "trades", trade.id);
  const disputeRef = doc(db, "trades", trade.id, "disputes", dispute.id);
  const sellerWalletRef = doc(db, "users", trade.sellerId, "wallets", trade.crypto);

  return runTransaction(db, async (transaction) => {
    const sellerWalletDoc = await transaction.get(sellerWalletRef);
    if (!sellerWalletDoc.exists()) throw new Error("Seller wallet not found.");
    const sellerWallet = sellerWalletDoc.data() as UserWallet;

    if (winnerId === trade.sellerId) {
      // Return funds to seller
      if (sellerWallet.lockedBalance < trade.amount) throw new Error("Insufficient locked funds to return.");
      transaction.update(sellerWalletRef, {
        balance: sellerWallet.balance + trade.amount,
        lockedBalance: sellerWallet.lockedBalance - trade.amount,
      });
      transaction.update(tradeRef, { status: "cancelled" });
    } else { // Winner is buyer
      // Release funds (same as normal release, just from dispute context)
      // The buyer will claim it via the `claimFundsForTrade` function automatically
      if (sellerWallet.lockedBalance < trade.amount) throw new Error("Insufficient locked funds to release.");
      transaction.update(sellerWalletRef, {
        lockedBalance: sellerWallet.lockedBalance - trade.amount
      });
      transaction.update(tradeRef, { status: "released" });
    }

    // Update the dispute document
    transaction.update(disputeRef, {
      status: "resolved",
      winnerId: winnerId,
      resolvedBy: adminId,
      resolutionNote: `Dispute awarded to ${winnerId === trade.buyerId ? 'buyer' : 'seller'} by moderator.`,
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

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(userWalletRef);
    let currentBalance = 0;
    let currentLockedBalance = 0;

    if (walletDoc.exists()) {
      const walletData = walletDoc.data() as UserWallet;
      currentBalance = walletData.balance;
      currentLockedBalance = walletData.lockedBalance;
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
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Create a log entry for this action
    transaction.set(adminLogRef, {
      adminId: adminId,
      action: `Adjusted ${userDisplayName}'s ${crypto} balance. Action: ${action}, Amount: ${amount}. Reason: ${reason}`,
      targetId: userId,
      createdAt: serverTimestamp(),
    });
  });
}
