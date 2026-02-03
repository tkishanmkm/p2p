
"use client";

import {
  doc,
  runTransaction,
  writeBatch,
  serverTimestamp,
  Firestore,
  updateDoc,
} from "firebase/firestore";
import type { Deposit, Dispute, Trade, UserWallet, Withdrawal, SupportTicket } from "./types";

/**
 * Approves a deposit and updates the user's wallet balance in a single transaction.
 */
export async function approveDeposit(
  db: Firestore,
  deposit: Deposit
): Promise<void> {
  const depositRef = doc(db, "users", deposit.userId, "deposits", deposit.id);
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
  const depositRef = doc(db, "users", deposit.userId, "deposits", deposit.id);
  await writeBatch(db)
    .update(depositRef, {
      status: "declined",
      adminId: "admin_placeholder",
    })
    .commit();
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
